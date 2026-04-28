import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useProgress(planId) {
  const { user } = useAuth()
  const [completedDays, setCompletedDays] = useState([])
  const [seriesLog, setSeriesLog] = useState({}) // { "day-exName": seriesDone }
  const [loading, setLoading] = useState(true)

  // Cargar progreso del plan activo
  useEffect(() => {
    if (!user || !planId) { setLoading(false); return }
    loadProgress()
  }, [user, planId])

  const loadProgress = async () => {
    setLoading(true)
    // Días completados
    const { data: prog } = await supabase
      .from('progress')
      .select('day_number, exercises_done')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .order('day_number')

    if (prog) setCompletedDays(prog.map(p => p.day_number))

    // Series completadas (hoy)
    const today = new Date().toISOString().split('T')[0]
    const { data: series } = await supabase
      .from('series_log')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_id', planId)
      .gte('logged_at', today)

    if (series) {
      const map = {}
      series.forEach(s => { map[`${s.day_number}-${s.exercise_name}`] = s.series_done })
      setSeriesLog(map)
    }
    setLoading(false)
  }

  // Guardar serie completada
  const logSeries = useCallback(async (dayNumber, exerciseName, seriesDone) => {
    if (!user || !planId) return
    const key = `${dayNumber}-${exerciseName}`
    setSeriesLog(prev => ({ ...prev, [key]: seriesDone }))

    await supabase.from('series_log').upsert({
      user_id: user.id,
      plan_id: planId,
      day_number: dayNumber,
      exercise_name: exerciseName,
      series_done: seriesDone,
      completed: false,
      logged_at: new Date().toISOString()
    }, { onConflict: 'user_id,plan_id,day_number,exercise_name' })
  }, [user, planId])

  // Marcar día como completo
  const completeDay = useCallback(async (dayNumber, exercisesDone = []) => {
    if (!user || !planId) return
    setCompletedDays(prev => [...new Set([...prev, dayNumber])])

    await supabase.from('progress').upsert({
      user_id: user.id,
      plan_id: planId,
      day_number: dayNumber,
      exercises_done: exercisesDone,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id,plan_id,day_number' })
  }, [user, planId])

  const isDayDone = (day) => completedDays.includes(day)
  const getSeriesDone = (day, exName) => seriesLog[`${day}-${exName}`] || 0

  return { completedDays, isDayDone, getSeriesDone, logSeries, completeDay, loading, reload: loadProgress }
}
