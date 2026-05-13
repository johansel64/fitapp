import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const cache = new Map()
const CACHE_TTL = 30_000
const PAGE_SIZE = 20

export function useExercises() {
  const { user } = useAuth()
  const [myExercises, setMyExercises] = useState([])
  const [publicExercises, setPublicExercises] = useState([])
  const [totalMyCount, setTotalMyCount] = useState(0)
  const [totalPublicCount, setTotalPublicCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hasMoreMy, setHasMoreMy] = useState(true)
  const [hasMorePub, setHasMorePub] = useState(true)
  const pageMyRef = useRef(0)
  const pagePubRef = useRef(0)

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  const loadExercises = async (appendMy = false, appendPub = false) => {
    if (!appendMy && !appendPub) {
      setLoading(true)
      pageMyRef.current = 0
      pagePubRef.current = 0
    }

    const offsetMy = pageMyRef.current * PAGE_SIZE
    const offsetPub = pagePubRef.current * PAGE_SIZE

    const promises = []
    if (!appendMy) {
      promises.push(
        supabase.from('exercises').select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(offsetMy, offsetMy + PAGE_SIZE - 1)
      )
    } else {
      promises.push(Promise.resolve(null))
    }

    if (!appendPub) {
      promises.push(
        supabase.from('exercises').select('*')
          .eq('is_public', true)
          .neq('user_id', user.id)
          .order('likes_count', { ascending: false })
          .range(offsetPub, offsetPub + PAGE_SIZE - 1)
      )
    } else {
      promises.push(Promise.resolve(null))
    }

    const [myResult, pubResult] = await Promise.all(promises)
    const myData = myResult?.data || []
    const pubData = pubResult?.data || []

    if (!appendMy && !appendPub) {
      const [{ count: c1 }, { count: c2 }] = await Promise.all([
        supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('exercises').select('*', { count: 'exact', head: true }).eq('is_public', true).neq('user_id', user.id),
      ])
      setTotalMyCount(c1 || 0)
      setTotalPublicCount(c2 || 0)
    }

    if (!appendMy && !appendPub) {
      setMyExercises(myData)
      setPublicExercises(pubData)
    }
    if (appendMy) setMyExercises(prev => [...prev, ...myData])
    if (appendPub) setPublicExercises(prev => [...prev, ...pubData])

    if (!appendMy || myData.length > 0) {
      setHasMoreMy(myData.length >= PAGE_SIZE)
    }
    if (!appendPub || pubData.length > 0) {
      setHasMorePub(pubData.length >= PAGE_SIZE)
    }
    setLoading(false)
  }

  const loadMoreMy = useCallback(() => {
    pageMyRef.current += 1
    loadExercises(true, false)
  }, [user])

  const loadMorePub = useCallback(() => {
    pagePubRef.current += 1
    loadExercises(false, true)
  }, [user])

  const loadPageMy = useCallback((page) => {
    pageMyRef.current = page
    loadExercises(false, false)
  }, [user])

  const loadPagePub = useCallback((page) => {
    pagePubRef.current = page
    loadExercises(false, false)
  }, [user])

  const searchExercises = async (query = '', filters = {}, page = 0) => {
    const cacheKey = JSON.stringify({ query, filters, uid: user.id, page })
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

    let q = supabase.from('exercises').select('*')
      .or(`is_public.eq.true,user_id.eq.${user.id}`)

    if (query) q = q.ilike('name', `%${query}%`)
    if (filters.muscle_group) q = q.eq('muscle_group', filters.muscle_group)
    if (filters.difficulty) q = q.eq('difficulty', filters.difficulty)
    if (filters.equipment) q = q.eq('equipment', filters.equipment)
    if (filters.myOnly) q = q.eq('user_id', user.id)

    const offset = page * PAGE_SIZE
    q = q.order('likes_count', { ascending: false }).range(offset, offset + PAGE_SIZE - 1)
    const { data } = await q
    const result = { data: data || [], hasMore: (data || []).length >= PAGE_SIZE }
    cache.set(cacheKey, { data: result, ts: Date.now() })
    return result
  }

  const createExercise = useCallback(async (exercise) => {
    const { data, error } = await supabase.from('exercises').insert({
      user_id: user.id,
      name: exercise.name,
      description: exercise.description || null,
      youtube_url: exercise.youtube_url || null,
      muscle_group: exercise.muscle_group || null,
      equipment: exercise.equipment || null,
      difficulty: exercise.difficulty || 'beginner',
      is_public: exercise.is_public || false,
    }).select().maybeSingle()

    if (data) {
      cache.clear()
      setMyExercises(prev => [data, ...prev])
      setTotalMyCount(c => c + 1)
      if (data.is_public) {
        setPublicExercises(prev => [data, ...prev])
        setTotalPublicCount(c => c + 1)
      }
    }
    return { data, error }
  }, [user])

  const updateExercise = useCallback(async (id, updates) => {
    const prevData = myExercises.find(e => e.id === id)
    const { data, error } = await supabase.from('exercises')
      .update(updates).eq('id', id).select().maybeSingle()
    if (data) {
      cache.clear()
      setMyExercises(prev => prev.map(e => e.id === id ? data : e))
      if (data.is_public) {
        setPublicExercises(prev => {
          const exists = prev.find(e => e.id === id)
          return exists ? prev.map(e => e.id === id ? data : e) : [data, ...prev]
        })
        if (!prevData?.is_public) setTotalPublicCount(c => c + 1)
      } else {
        setPublicExercises(prev => prev.filter(e => e.id !== id))
        if (prevData?.is_public) setTotalPublicCount(c => Math.max(0, c - 1))
      }
    }
    return { data, error }
  }, [myExercises])

  const deleteExercise = useCallback(async (id) => {
    const target = myExercises.find(e => e.id === id)
    await supabase.from('exercises').delete().eq('id', id)
    cache.clear()
    setMyExercises(prev => prev.filter(e => e.id !== id))
    setPublicExercises(prev => prev.filter(e => e.id !== id))
    if (target) {
      setTotalMyCount(c => Math.max(0, c - 1))
      if (target.is_public) setTotalPublicCount(c => Math.max(0, c - 1))
    }
  }, [myExercises])

  const toggleLike = useCallback(async (exerciseId) => {
    const { data } = await supabase.rpc('toggle_exercise_like', { p_exercise_id: exerciseId })
    cache.clear()
    await loadExercises()
    return data
  }, [])

  const getUserLikes = useCallback(async () => {
    const { data } = await supabase.from('exercise_likes')
      .select('exercise_id').eq('user_id', user.id)
    return (data || []).map(l => l.exercise_id)
  }, [user])

  return {
    myExercises, publicExercises,
    totalMyCount, totalPublicCount,
    loading, hasMoreMy, hasMorePub,
    loadMoreMy, loadMorePub, loadPageMy, loadPagePub,
    searchExercises, createExercise, updateExercise, deleteExercise,
    toggleLike, getUserLikes,
    PAGE_SIZE,
  }
}
