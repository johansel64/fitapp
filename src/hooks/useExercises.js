import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useExercises() {
  const { user } = useAuth()
  const [myExercises, setMyExercises] = useState([])
  const [publicExercises, setPublicExercises] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadExercises()
  }, [user])

  const loadExercises = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setMyExercises(data.filter(e => e.user_id === user.id))
      setPublicExercises(data.filter(e => e.is_public))
    }
    setLoading(false)
  }

  const searchExercises = async (query = '', filters = {}) => {
    let q = supabase.from('exercises').select('*')
      .or(`is_public.eq.true,user_id.eq.${user.id}`)

    if (query) q = q.ilike('name', `%${query}%`)
    if (filters.muscle_group) q = q.eq('muscle_group', filters.muscle_group)
    if (filters.difficulty) q = q.eq('difficulty', filters.difficulty)
    if (filters.equipment) q = q.eq('equipment', filters.equipment)

    q = q.order('likes_count', { ascending: false }).limit(50)
    const { data } = await q
    return data || []
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
    }).select().single()

    if (data) {
      setMyExercises(prev => [data, ...prev])
      if (data.is_public) setPublicExercises(prev => [data, ...prev])
    }
    return { data, error }
  }, [user])

  const updateExercise = useCallback(async (id, updates) => {
    const { data, error } = await supabase.from('exercises')
      .update(updates).eq('id', id).select().single()
    if (data) {
      setMyExercises(prev => prev.map(e => e.id === id ? data : e))
      setPublicExercises(prev => prev.map(e => e.id === id ? data : e))
    }
    return { data, error }
  }, [])

  const deleteExercise = useCallback(async (id) => {
    await supabase.from('exercises').delete().eq('id', id)
    setMyExercises(prev => prev.filter(e => e.id !== id))
    setPublicExercises(prev => prev.filter(e => e.id !== id))
  }, [])

  const toggleLike = useCallback(async (exerciseId) => {
    const { data } = await supabase.rpc('toggle_exercise_like', { p_exercise_id: exerciseId })
    await loadExercises()
    return data
  }, [])

  const getUserLikes = useCallback(async () => {
    const { data } = await supabase.from('exercise_likes')
      .select('exercise_id').eq('user_id', user.id)
    return (data || []).map(l => l.exercise_id)
  }, [user])

  return { myExercises, publicExercises, loading, loadExercises, searchExercises, createExercise, updateExercise, deleteExercise, toggleLike, getUserLikes }
}
