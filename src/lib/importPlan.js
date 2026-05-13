/**
 * ── PLAN JSON FORMAT ────────────────────────────
 * {
 *   "program": {
 *     "name": "string (required)",
 *     "totalDays": number (optional, default: days.length)
 *   },
 *   "days": [{
 *     "calendarDay": number (required),
 *     "label": "string (optional)",
 *     "type": "training" | "rest" | "optional",
 *     "workout": {                              // null if rest
 *       "segments": [{
 *         "order": number,
 *         "name": "string",
 *         "protocol": "string (optional)",
 *         "sets": number (default 3),
 *         "restBetweenSetsSec": number (default 60),
 *         "notes": "string (optional)",
 *         "exercises": [{
 *           "order": number,
 *           "name": "string (required)",
 *           "type": "reps" | "time",
 *           "guide": "string (eg: '15 reps', '20 seg')",
 *           "youtubeUrl": "string (optional)",
 *           "youtubeId": "string (optional)"
 *         }]
 *       }]
 *     }
 *   }]
 * }
 */

export function normalizeExName(name) {
  return (name || '').trim().toLowerCase()
}

export function validatePlanJSON(json) {
  const errors = []
  if (!json || typeof json !== 'object') return { valid: false, errors: ['JSON inválido: debe ser un objeto'] }
  if (!Array.isArray(json.days)) return { valid: false, errors: ['Falta el array "days"'] }

  json.days.forEach((day, i) => {
    const label = day.calendarDay ? `Día ${day.calendarDay}` : `índice ${i}`
    if (!day.calendarDay) errors.push(`${label}: falta calendarDay`)
    if (!day.type) errors.push(`${label}: falta type`)
    if (day.type !== 'rest' && day.workout) {
      if (!Array.isArray(day.workout.segments)) {
        errors.push(`${label}: workout.segments debe ser un array`)
      } else {
        day.workout.segments.forEach((seg, j) => {
          if (!Array.isArray(seg.exercises) || seg.exercises.length === 0)
            errors.push(`${label}, segmento ${j + 1}: exercises debe ser un array no vacío`)
          if (!seg.name)
            errors.push(`${label}, segmento ${j + 1}: falta name`)
        })
      }
    }
  })

  return { valid: errors.length === 0, errors }
}

export function extractUniqueExercises(days) {
  const map = new Map()

  for (const day of days) {
    if (!day.workout?.segments) continue
    for (const seg of day.workout.segments) {
      if (!seg.exercises) continue
      for (const ex of seg.exercises) {
        if (!ex.name) continue
        const key = normalizeExName(ex.name)
        if (!map.has(key)) {
          map.set(key, { name: ex.name.trim(), youtube_url: ex.youtubeUrl || null })
        }
        if (ex.youtubeUrl && !map.get(key).youtube_url) {
          map.get(key).youtube_url = ex.youtubeUrl
        }
      }
    }
  }

  return Array.from(map.values())
}

export function guideToReps(guide, type) {
  if (!guide) return type === 'time' ? '30s' : '12'
  const cleaned = guide.trim().toLowerCase()

  if (type === 'time') {
    const numMatch = cleaned.match(/^(\d+)/)
    const num = numMatch ? parseInt(numMatch[1]) : 30
    if (cleaned.includes('min')) return `${num * 60}s`
    return `${num}s`
  }

  const numMatch = cleaned.match(/^(\d+)/)
  return numMatch ? numMatch[1] : '12'
}

export function countImportStats(jsonData) {
  let trainingDays = 0
  let restDays = 0
  let emptyDays = 0
  let totalSegments = 0
  let totalExercises = 0

  for (const day of jsonData.days || []) {
    if (day.type === 'rest' || (day.type !== 'training' && day.type !== 'optional')) {
      restDays++
      continue
    }
    if (!day.workout?.segments || day.workout.segments.length === 0) {
      emptyDays++
      continue
    }
    trainingDays++
    totalSegments += day.workout.segments.length
    for (const seg of day.workout.segments) {
      totalExercises += (seg.exercises || []).length
    }
  }

  return {
    name: jsonData.program?.name || 'Plan importado',
    totalDays: jsonData.program?.totalDays || (jsonData.days || []).length,
    trainingDays,
    restDays,
    emptyDays,
    totalSegments,
    totalExercises,
    uniqueExercises: extractUniqueExercises(jsonData.days || []).length,
  }
}

export function buildDayExercises(jsonDays, createdDays, exerciseMap) {
  const dayByNumber = {}
  for (const d of createdDays) {
    dayByNumber[d.day_number] = d
  }

  const allPdes = []

  for (const jsonDay of jsonDays) {
    const dbDay = dayByNumber[jsonDay.calendarDay]
    if (!dbDay || dbDay.type === 'rest' || !jsonDay.workout?.segments) continue

    let globalOrder = 0

    for (const seg of jsonDay.workout.segments) {
      const exercises = seg.exercises || []
      if (exercises.length === 0) continue

      const isMulti = exercises.length > 1
      const groupId = isMulti ? `ss_${jsonDay.calendarDay}_${seg.order}` : null

      for (const ex of exercises) {
        const exKey = normalizeExName(ex.name)
        const exerciseId = exerciseMap[exKey]
        if (!exerciseId) continue

        const isLeader = ex.order === (exercises[0]?.order ?? 1)
        const exType = ex.type || 'reps'
        const reps = guideToReps(ex.guide, exType)

        const noteParts = []
        if (seg.protocol && seg.protocol !== 'Normal') {
          noteParts.push(seg.protocol)
        }
        if (seg.notes) noteParts.push(seg.notes)
        if (ex.guide) noteParts.push(ex.guide)
        const note = noteParts.length > 0 ? noteParts.join(' | ') : null

        allPdes.push({
          plan_day_id: dbDay.id,
          exercise_id: exerciseId,
          sets: isLeader || !isMulti ? (seg.sets || 3) : null,
          reps: isLeader || !isMulti ? reps : null,
          rest_seconds: isLeader || !isMulti ? (seg.restBetweenSetsSec ?? 60) : null,
          order_index: globalOrder++,
          note,
          superset_group: groupId,
        })
      }
    }
  }

  return allPdes
}
