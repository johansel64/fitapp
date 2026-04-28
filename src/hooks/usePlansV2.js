import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePlansV2() {
  const { user } = useAuth()
  const [myPlans, setMyPlans] = useState([])
  const [activePlan, setActivePlanState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadPlans()
  }, [user])

  const loadPlans = async () => {
    setLoading(true)
    const { data } = await supabase.from('plans').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    if (data) setMyPlans(data)

    // Cargar plan activo
  const { data: uap } = await supabase.from('user_active_plan')
    .select('*, plan:plans(*)').eq('user_id', user.id).maybeSingle()
  if (uap?.plan) setActivePlanState(uap.plan)
    setLoading(false)
  }

  const getPublicPlans = async (query = '') => {
    let q = supabase.from('plans').select('*')
      .eq('is_public', true)
      .order('likes_count', { ascending: false })
    if (query) q = q.ilike('name', `%${query}%`)
    const { data } = await q.limit(30)
    return data || []
  }

  const createPlan = useCallback(async (plan) => {
    const { data, error } = await supabase.from('plans').insert({
      user_id: user.id,
      name: plan.name,
      description: plan.description || null,
      total_days: plan.total_days || 30,
      is_public: plan.is_public || false,
    }).select().single()
    if (data) setMyPlans(prev => [data, ...prev])
    return { data, error }
  }, [user])

  const updatePlan = useCallback(async (id, updates) => {
    const { data } = await supabase.from('plans').update(updates).eq('id', id).select().single()
    if (data) setMyPlans(prev => prev.map(p => p.id === id ? data : p))
    return data
  }, [])

  const deletePlan = useCallback(async (id) => {
    await supabase.from('plans').delete().eq('id', id)
    setMyPlans(prev => prev.filter(p => p.id !== id))
    if (activePlan?.id === id) setActivePlanState(null)
  }, [activePlan])

  const setActivePlan = useCallback(async (planId) => {
    await supabase.from('user_active_plan').upsert({
      user_id: user.id, plan_id: planId, started_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    const plan = myPlans.find(p => p.id === planId)
    setActivePlanState(plan || null)
  }, [user, myPlans])

  // ── DÍAS ──────────────────────────────────────
  const getPlanDays = async (planId) => {
    const { data } = await supabase.from('plan_days')
      .select(`*, exercises:plan_day_exercises(*, exercise:exercises(*))`)
      .eq('plan_id', planId).order('day_number')
    return data || []
  }

  const upsertDay = useCallback(async (planId, dayNumber, type = 'training', name = null) => {
    const { data } = await supabase.from('plan_days').upsert({
      plan_id: planId, day_number: dayNumber, type, name
    }, { onConflict: 'plan_id,day_number' }).select().single()
    return data
  }, [])

  const deleteDay = useCallback(async (planId, dayNumber) => {
    await supabase.from('plan_days')
      .delete().eq('plan_id', planId).eq('day_number', dayNumber)
  }, [])

  // ── EJERCICIOS EN DÍA ────────────────────────
  const addExerciseToDay = useCallback(async (planDayId, exerciseId, config = {}) => {
    // Obtener el orden actual
    const { data: existing } = await supabase.from('plan_day_exercises')
      .select('order_index').eq('plan_day_id', planDayId).order('order_index', { ascending: false }).limit(1)
    const nextOrder = existing?.length ? (existing[0].order_index + 1) : 0

    const { data } = await supabase.from('plan_day_exercises').insert({
      plan_day_id: planDayId,
      exercise_id: exerciseId,
      sets: config.sets || 3,
      reps: config.reps || '12',
      rest_seconds: config.rest_seconds || 45,
      duration_seconds: config.duration_seconds || null,
      order_index: nextOrder
    }).select('*, exercise:exercises(*)').single()
    return data
  }, [])

  const updateExerciseInDay = useCallback(async (pdeId, updates) => {
    const { data } = await supabase.from('plan_day_exercises')
      .update(updates).eq('id', pdeId).select('*, exercise:exercises(*)').single()
    return data
  }, [])

  const removeExerciseFromDay = useCallback(async (pdeId) => {
    await supabase.from('plan_day_exercises').delete().eq('id', pdeId)
  }, [])

  // ── LIKES ─────────────────────────────────────
  const toggleLike = useCallback(async (planId) => {
    const { data } = await supabase.rpc('toggle_plan_like', { p_plan_id: planId })
    await loadPlans()
    return data
  }, [])

  const getUserLikes = useCallback(async () => {
    const { data } = await supabase.from('plan_likes')
      .select('plan_id').eq('user_id', user.id)
    return (data || []).map(l => l.plan_id)
  }, [user])

  return {
    myPlans, activePlan, loading,
    loadPlans, getPublicPlans, createPlan, updatePlan, deletePlan, setActivePlan,
    getPlanDays, upsertDay, deleteDay,
    addExerciseToDay, updateExerciseInDay, removeExerciseFromDay,
    toggleLike, getUserLikes
  }
}
