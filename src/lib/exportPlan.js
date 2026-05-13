import { supabase } from './supabase'
import { parseReps } from './parseReps'

/**
 * Reconstruye el JSON de un plan en el formato de importación.
 * Para cada plan_day_exercise, si tiene superset_group, se agrupa en un segmento.
 * Si no, va como segmento individual.
 */
export async function buildExportJSON(planId, userId) {
  const { data: plan } = await supabase.from('plans')
    .select('*').eq('id', planId).eq('user_id', userId).maybeSingle()
  if (!plan) return null

  const { data: days } = await supabase.from('plan_days')
    .select(`*, exercises:plan_day_exercises(*, exercise:exercises(*))`)
    .eq('plan_id', planId).order('day_number')

  if (!days) return null

  const jsonDays = days.map(day => {
    const pdes = (day.exercises || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

    if (day.type === 'rest' || pdes.length === 0) {
      return {
        calendarDay: day.day_number,
        label: day.name || `Día ${day.day_number} - Descanso`,
        type: day.type || 'rest',
        workout: null,
      }
    }

    // Agrupar PDEs por superset_group, los sin grupo son segmentos individuales
    const segmentMap = new Map()
    const soloPdes = []

    for (const pde of pdes) {
      if (pde.superset_group) {
        if (!segmentMap.has(pde.superset_group)) {
          segmentMap.set(pde.superset_group, [])
        }
        segmentMap.get(pde.superset_group).push(pde)
      } else {
        soloPdes.push(pde)
      }
    }

    let segOrder = 1
    const segments = []

    // Segmentos individuales
    for (const pde of soloPdes) {
      const repInfo = parseReps(pde.reps)
      const guide = repInfo.type === 'time'
        ? `${repInfo.val}s`
        : `${repInfo.val} reps`

      const exName = pde.exercise?.name || 'Ejercicio'
      const noteText = pde.note || ''

      segments.push({
        order: segOrder++,
        name: exName,
        protocol: noteText.includes(' | ') ? noteText.split(' | ')[0] : 'Normal',
        sets: pde.sets || 3,
        restBetweenSetsSec: pde.rest_seconds ?? 60,
        notes: noteText,
        exercises: [{
          order: 1,
          name: exName,
          type: repInfo.type,
          guide,
          youtubeUrl: pde.exercise?.youtube_url || null,
          youtubeId: extractYtId(pde.exercise?.youtube_url),
        }],
      })
    }

    // Segmentos superserie
    for (const [groupId, groupPdes] of segmentMap) {
      const leader = groupPdes.find(p => p.sets != null) || groupPdes[0]
      const noteText = leader.note || ''
      const protocol = noteText.includes(' | ') ? noteText.split(' | ')[0] : 'Normal'
      const notes = noteText.includes(' | ') ? noteText.split(' | ').slice(1).join(' | ') || null : null

      const exercises = groupPdes.map((pde, i) => {
        const ex = pde.exercise
        const repInfo = parseReps(pde.reps || '12')
        const guide = repInfo.type === 'time'
          ? `${repInfo.val}s`
          : `${repInfo.val} reps`

        return {
          order: i + 1,
          name: ex?.name || 'Ejercicio',
          type: repInfo.type,
          guide,
          youtubeUrl: ex?.youtube_url || null,
          youtubeId: extractYtId(ex?.youtube_url),
        }
      })

      segments.push({
        order: segOrder++,
        name: leader.exercise?.name || 'Superserie',
        protocol,
        sets: leader.sets || 3,
        restBetweenSetsSec: leader.rest_seconds ?? 60,
        notes,
        exercises,
      })
    }

    return {
      calendarDay: day.day_number,
      label: day.name || `Día ${day.day_number}`,
      type: day.type === 'optional' ? 'optional' : (day.type || 'training'),
      workout: {
        segments: segments.sort((a, b) => a.order - b.order),
      },
    }
  })

  return {
    program: {
      name: plan.name,
      totalDays: plan.total_days,
    },
    days: jsonDays,
  }
}

function extractYtId(url) {
  if (!url) return null
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/\s]+)/)
  return match ? match[1] : null
}

export function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
