import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { getDayType, getDayName, WARMUP_EXERCISES } from '../data/templates'
import { validatePlanJSON, extractUniqueExercises, normalizeExName, buildDayExercises } from '../lib/importPlan'

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
    }).select().maybeSingle()
    if (data) setMyPlans(prev => [data, ...prev])
    return { data, error }
  }, [user])

  const updatePlan = useCallback(async (id, updates) => {
    const { data } = await supabase.from('plans').update(updates).eq('id', id).select().maybeSingle()
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
    }, { onConflict: 'plan_id,day_number' }).select().maybeSingle()
    return data
  }, [])

  const deleteDay = useCallback(async (planId, dayNumber) => {
    await supabase.from('plan_days')
      .delete().eq('plan_id', planId).eq('day_number', dayNumber)
  }, [])

  // ── EJERCICIOS EN DÍA ────────────────────────
  const addExerciseToDay = useCallback(async (planDayId, exerciseId, config = {}) => {
    const { data: existing } = await supabase.from('plan_day_exercises')
      .select('order_index').eq('plan_day_id', planDayId).order('order_index', { ascending: false }).limit(1)
    const nextOrder = existing?.length ? (existing[0].order_index + 1) : 0

    const { data } = await supabase.from('plan_day_exercises').insert({
      plan_day_id: planDayId,
      exercise_id: exerciseId,
      sets: parseInt(config.sets) || 3,
      reps: config.reps || '12',
      rest_seconds: parseInt(config.rest_seconds) || 45,
      order_index: nextOrder,
      note: config.note || null,
      superset_group: config.superset_group || null,
    }).select('*, exercise:exercises(*)').maybeSingle()
    return data
  }, [])

  const updateExerciseInDay = useCallback(async (pdeId, updates) => {
    const sanitized = {
      sets: updates.sets != null ? parseInt(updates.sets) || 3 : undefined,
      reps: updates.reps || '12',
      rest_seconds: updates.rest_seconds != null ? parseInt(updates.rest_seconds) || 0 : undefined,
      note: updates.note != null ? updates.note : undefined,
      superset_group: updates.superset_group !== undefined ? updates.superset_group : undefined,
    }
    Object.keys(sanitized).forEach(k => sanitized[k] === undefined && delete sanitized[k])

    const { data } = await supabase.from('plan_day_exercises')
      .update(sanitized).eq('id', pdeId).select('*, exercise:exercises(*)').maybeSingle()
    return data
  }, [])

  const removeExerciseFromDay = useCallback(async (pdeId) => {
    await supabase.from('plan_day_exercises').delete().eq('id', pdeId)
  }, [])

  // ── SUPER SERIES ─────────────────────────────
  const createSupersetGroup = useCallback(async (planDayId, exerciseIds, config = {}) => {
    const groupId = `ss_${Date.now()}`
    const { data: existing } = await supabase.from('plan_day_exercises')
      .select('order_index').eq('plan_day_id', planDayId).order('order_index', { ascending: false }).limit(1)
    let nextOrder = existing?.length ? (existing[0].order_index + 1) : 0

    const results = []
    for (let i = 0; i < exerciseIds.length; i++) {
      const isLeader = i === 0
      const { data } = await supabase.from('plan_day_exercises').insert({
        plan_day_id: planDayId,
        exercise_id: exerciseIds[i],
        sets: isLeader ? (parseInt(config.sets) || 3) : null,
        reps: isLeader ? (config.reps || '12') : null,
        rest_seconds: isLeader ? (parseInt(config.rest_seconds) || 45) : null,
        order_index: nextOrder++,
        note: isLeader ? (config.note || null) : null,
        superset_group: groupId,
      }).select('*, exercise:exercises(*)').maybeSingle()
      results.push(data)
    }
    return { groupId, exercises: results }
  }, [])

  const addExerciseToSuperset = useCallback(async (planDayId, groupId, exerciseId) => {
    const { data: existing } = await supabase.from('plan_day_exercises')
      .select('order_index').eq('plan_day_id', planDayId).order('order_index', { ascending: false }).limit(1)
    const nextOrder = existing?.length ? (existing[0].order_index + 1) : 0

    const { data } = await supabase.from('plan_day_exercises').insert({
      plan_day_id: planDayId,
      exercise_id: exerciseId,
      sets: null,
      reps: null,
      rest_seconds: null,
      order_index: nextOrder,
      superset_group: groupId,
    }).select('*, exercise:exercises(*)').maybeSingle()
    return data
  }, [])

  const deleteSupersetGroup = useCallback(async (groupId) => {
    await supabase.from('plan_day_exercises').delete().eq('superset_group', groupId)
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

  // ── CREAR PLAN DESDE PLANTILLA ────────────────
  const createPlanFromTemplate = useCallback(async (template) => {
    const { data: plan, error } = await supabase.from('plans').insert({
      user_id: user.id,
      name: template.name,
      description: template.description || null,
      total_days: template.total_days,
      is_public: template.is_public || false,
    }).select().maybeSingle()

    if (error || !plan) return { data: null, error }

    const daysData = []
    for (let d = 1; d <= template.total_days; d++) {
      const type = template.dayTypes?.[d - 1] || getDayType(d)
      const dayName = getDayName(d)
      const label = type === 'rest' ? `${dayName} - Descanso` : `${dayName} - Entrenamiento`
      daysData.push({ plan_id: plan.id, day_number: d, type, name: label })
    }

    const { data: createdDays } = await supabase.from('plan_days')
      .insert(daysData).select('*')

    if (template.warmup && createdDays) {
      const trainingDays = createdDays.filter(d => d.type === 'training')
      if (trainingDays.length > 0) {
        const warmupNames = WARMUP_EXERCISES.map(e => e.name)
        const { data: existingExercises } = await supabase.from('exercises')
          .select('*').in('name', warmupNames).eq('muscle_group', ['full_body', 'cardio', 'core'])

        const existingMap = {}
        if (existingExercises) existingExercises.forEach(e => { existingMap[e.name] = e.id })

        const toCreate = []
        WARMUP_EXERCISES.forEach(ex => {
          if (!existingMap[ex.name]) toCreate.push({
            user_id: user.id, name: ex.name, muscle_group: ex.muscle_group,
            equipment: ex.equipment, difficulty: ex.difficulty, is_public: true,
          })
        })

        if (toCreate.length > 0) {
          const { data: newExercises } = await supabase.from('exercises').insert(toCreate).select('*')
          if (newExercises) newExercises.forEach(e => { existingMap[e.name] = e.id })
        }

        const pdeData = []
        trainingDays.forEach(day => {
          WARMUP_EXERCISES.forEach((ex, idx) => {
            const exerciseId = existingMap[ex.name]
            if (exerciseId) {
              pdeData.push({
                plan_day_id: day.id, exercise_id: exerciseId,
                sets: ex.sets, reps: ex.reps, rest_seconds: ex.rest_seconds,
                order_index: idx,
              })
            }
          })
        })

        if (pdeData.length > 0) {
          await supabase.from('plan_day_exercises').insert(pdeData)
        }
      }
    }

    return { data: plan, error: null }
  }, [user])

  const clonePlan = useCallback(async (planId) => {
    const { data: original } = await supabase.from('plans')
      .select('*').eq('id', planId).maybeSingle()
    if (!original) return { data: null, error: 'Plan no encontrado' }

    const { data: clone, error } = await supabase.from('plans').insert({
      user_id: user.id,
      name: `Copia de ${original.name}`,
      description: original.description,
      total_days: original.total_days,
      is_public: false,
    }).select().maybeSingle()

    if (error || !clone) return { data: null, error }

    const { data: originalDays } = await supabase.from('plan_days')
      .select(`*, exercises:plan_day_exercises(*, exercise:exercises(*))`)
      .eq('plan_id', planId).order('day_number')

    if (!originalDays) return { data: clone, error: null }

    const daysData = originalDays.map(d => ({
      plan_id: clone.id, day_number: d.day_number, type: d.type, name: d.name,
    }))
    const { data: newDays } = await supabase.from('plan_days').insert(daysData).select('*')

    if (!newDays) return { data: clone, error: null }

    const dayById = {}
    newDays.forEach(d => { dayById[d.day_number] = d })

    const exerciseNames = new Set()
    originalDays.forEach(d => {
      d.exercises?.forEach(pde => {
        if (pde.exercise?.user_id !== user.id) exerciseNames.add(pde.exercise?.name)
      })
    })

    const { data: existingExercises } = await supabase.from('exercises')
      .select('name, id').in('name', [...exerciseNames])

    const exerciseMap = {}
    if (existingExercises) existingExercises.forEach(e => { exerciseMap[e.name] = e.id })

    const toCreate = []
    originalDays.forEach(d => {
      d.exercises?.forEach(pde => {
        if (pde.exercise && pde.exercise.user_id !== user.id && !exerciseMap[pde.exercise.name]) {
          toCreate.push({
            user_id: user.id, name: pde.exercise.name,
            description: pde.exercise.description, youtube_url: pde.exercise.youtube_url,
            muscle_group: pde.exercise.muscle_group, equipment: pde.exercise.equipment,
            difficulty: pde.exercise.difficulty, is_public: false,
          })
          exerciseMap[pde.exercise.name] = null
        }
      })
    })

    if (toCreate.length > 0) {
      const { data: newExercises } = await supabase.from('exercises').insert(toCreate).select('*')
      if (newExercises) newExercises.forEach(e => { exerciseMap[e.name] = e.id })
    }

    const allPdes = []
    originalDays.forEach(d => {
      const newDay = dayById[d.day_number]
      if (!newDay) return
      d.exercises?.forEach((pde, idx) => {
        let exerciseId = pde.exercise_id
        if (pde.exercise?.user_id !== user.id) {
          exerciseId = exerciseMap[pde.exercise?.name] || pde.exercise_id
        }
        if (exerciseId) {
          allPdes.push({
            plan_day_id: newDay.id, exercise_id: exerciseId,
            sets: pde.sets, reps: pde.reps, rest_seconds: pde.rest_seconds,
            order_index: idx, note: pde.note, superset_group: pde.superset_group,
          })
        }
      })
    })

    if (allPdes.length > 0) {
      await supabase.from('plan_day_exercises').insert(allPdes)
    }

    return { data: clone, error: null }
  }, [user])

  const importPlanFromJSON = useCallback(async (jsonData, onProgress) => {
    const validation = validatePlanJSON(jsonData)
    if (!validation.valid) {
      return { data: null, error: validation.errors.join('. ') }
    }

    const planName = jsonData.program?.name || 'Plan importado'
    const totalDays = jsonData.program?.totalDays || jsonData.days.length

    if (onProgress) onProgress({ step: 'plan', message: 'Creando plan...' })
    const { data: plan, error: planError } = await supabase.from('plans').insert({
      user_id: user.id,
      name: planName,
      description: `Importado desde JSON · ${jsonData.days.length} días`,
      total_days: totalDays,
      is_public: false,
    }).select().maybeSingle()

    if (planError || !plan) {
      return { data: null, error: planError?.message || 'Error al crear el plan' }
    }

    if (onProgress) onProgress({ step: 'days', message: 'Creando días...' })
    const daysData = jsonData.days.map(d => ({
      plan_id: plan.id,
      day_number: d.calendarDay,
      type: d.type === 'optional' ? 'training' : (d.type || 'training'),
      name: d.label || `Día ${d.calendarDay}`,
    }))

    const { data: createdDays, error: daysError } = await supabase
      .from('plan_days').insert(daysData).select('*')

    if (daysError) return { data: null, error: daysError.message }

    const uniqueExercises = extractUniqueExercises(jsonData.days)
    const exerciseMap = {}

    if (onProgress) onProgress({ step: 'exercises', message: `Procesando ${uniqueExercises.length} ejercicios...`, current: 0, total: uniqueExercises.length })

    const allNames = uniqueExercises.map(e => e.name)
    const { data: existing } = await supabase.from('exercises')
      .select('id, name').in('name', allNames)
      .or(`is_public.eq.true,user_id.eq.${user.id}`)

    const existingByName = {}
    if (existing) existing.forEach(e => { existingByName[e.name.toLowerCase().trim()] = e.id })

    const toCreate = []
    uniqueExercises.forEach(ex => {
      const key = normalizeExName(ex.name)
      if (existingByName[key]) {
        exerciseMap[key] = existingByName[key]
      } else {
        toCreate.push({
          user_id: user.id,
          name: ex.name,
          youtube_url: ex.youtube_url || null,
          is_public: true,
        })
      }
    })

    if (toCreate.length > 0) {
      const { data: created } = await supabase.from('exercises').insert(toCreate).select('id, name')
      if (created) {
        created.forEach(e => {
          exerciseMap[e.name.toLowerCase().trim()] = e.id
        })
      }
    }

    if (onProgress) onProgress({ step: 'pdes', message: 'Vinculando ejercicios a días...' })

    const pdes = buildDayExercises(jsonData.days, createdDays, exerciseMap)

    if (pdes.length > 0) {
      const batchSize = 100
      const totalBatches = Math.ceil(pdes.length / batchSize)
      for (let i = 0; i < pdes.length; i += batchSize) {
        const batch = pdes.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1
        if (onProgress) onProgress({ step: 'pdes', message: `Guardando ejercicios... (${batchNum}/${totalBatches})`, current: batchNum, total: totalBatches })
        const { error: pdeError } = await supabase.from('plan_day_exercises').insert(batch)
        if (pdeError) return { data: null, error: pdeError.message }
      }
    }

    setMyPlans(prev => [plan, ...prev])

    return { data: plan, error: null }
  }, [user])

  return {
    myPlans, activePlan, loading,
    loadPlans, getPublicPlans, createPlan, updatePlan, deletePlan, setActivePlan,
    getPlanDays, upsertDay, deleteDay,
    addExerciseToDay, updateExerciseInDay, removeExerciseFromDay,
    createSupersetGroup, addExerciseToSuperset, deleteSupersetGroup,
    toggleLike, getUserLikes,
    createPlanFromTemplate, clonePlan,
    importPlanFromJSON
  }
}
