import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const cache = new Map()
const CACHE_TTL = 30_000

export function useExercises() {
  const { user } = useAuth()
  const [myExercises, setMyExercises] = useState([])
  const [publicExercises, setPublicExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const pageRef = useRef(0)
  const PAGE_SIZE = 30

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  const loadExercises = async (append = false) => {
    if (!append) {
      setLoading(true)
      pageRef.current = 0
    }

    const offset = pageRef.current * PAGE_SIZE

    const [myResult, pubResult] = await Promise.all([
      supabase.from('exercises').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
      supabase.from('exercises').select('*')
        .eq('is_public', true)
        .order('likes_count', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1),
    ])

    const myData = myResult.data || []
    const pubData = pubResult.data || []

    if (append) {
      setMyExercises(prev => [...prev, ...myData])
      setPublicExercises(prev => [...prev, ...pubData.filter(p => p.user_id !== user.id)])
    } else {
      setMyExercises(myData)
      setPublicExercises(pubData.filter(p => p.user_id !== user.id))
    }

    setHasMore(myData.length >= PAGE_SIZE || pubData.length >= PAGE_SIZE)
    setLoading(false)
  }

  const loadMore = useCallback(() => {
    pageRef.current += 1
    loadExercises(true)
  }, [user])

  const searchExercises = async (query = '', filters = {}) => {
    const cacheKey = JSON.stringify({ query, filters, uid: user.id })
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

    let q = supabase.from('exercises').select('*')
      .or(`is_public.eq.true,user_id.eq.${user.id}`)

    if (query) q = q.ilike('name', `%${query}%`)
    if (filters.muscle_group) q = q.eq('muscle_group', filters.muscle_group)
    if (filters.difficulty) q = q.eq('difficulty', filters.difficulty)
    if (filters.equipment) q = q.eq('equipment', filters.equipment)
    if (filters.myOnly) q = q.eq('user_id', user.id)

    q = q.order('likes_count', { ascending: false }).limit(50)
    const { data } = await q
    const result = data || []
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
      if (data.is_public) setPublicExercises(prev => [data, ...prev])
    }
    return { data, error }
  }, [user])

  const updateExercise = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from('exercises')
      .update(updates).eq('id', id).select().maybeSingle()
    if (data) {
      cache.clear()
      setMyExercises(prev => prev.map(e => e.id === id ? data : e))
      setPublicExercises(prev => prev.map(e => e.id === id ? data : e))
    }
    return { data, error }
  }, [])

  const deleteExercise = useCallback(async (id) => {
    await supabase.from('exercises').delete().eq('id', id)
    cache.clear()
    setMyExercises(prev => prev.filter(e => e.id !== id))
    setPublicExercises(prev => prev.filter(e => e.id !== id))
  }, [])

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

  return { myExercises, publicExercises, loading, hasMore, loadMore, loadExercises, searchExercises, createExercise, updateExercise, deleteExercise, toggleLike, getUserLikes }
}
