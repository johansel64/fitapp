import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function usePlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [activePlan, setActivePlanState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadPlans()
  }, [user])

  const loadPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setPlans(data)
      const active = data.find(p => p.is_active)
      if (active) setActivePlanState(active)
    }
    setLoading(false)
  }

  const createPlan = useCallback(async (planData) => {
    if (!user) return null
    const { data, error } = await supabase.from('plans').insert({
      user_id: user.id,
      name: planData.name,
      description: planData.description,
      emoji: planData.emoji || '💪',
      goal: planData.goal,
      level: planData.level,
      total_days: planData.days || 30,
      data: planData,
      is_active: false
    }).select().single()

    if (data) { setPlans(prev => [data, ...prev]); return data }
    return null
  }, [user])

  const setActivePlan = useCallback(async (planId) => {
    if (!user) return
    // Desactivar todos
    await supabase.from('plans').update({ is_active: false }).eq('user_id', user.id)
    // Activar el seleccionado
    await supabase.from('plans').update({ is_active: true }).eq('id', planId)

    setPlans(prev => prev.map(p => ({ ...p, is_active: p.id === planId })))
    const plan = plans.find(p => p.id === planId)
    setActivePlanState(plan ? { ...plan, is_active: true } : null)
  }, [user, plans])

  const deletePlan = useCallback(async (planId) => {
    await supabase.from('plans').delete().eq('id', planId)
    setPlans(prev => prev.filter(p => p.id !== planId))
    if (activePlan?.id === planId) setActivePlanState(null)
  }, [activePlan])

  return { plans, activePlan, loading, loadPlans, createPlan, setActivePlan, deletePlan }
}
