export function parseReps(reps) {
  if (!reps) return { type: 'reps', val: 12 }
  const trimmed = reps.trim().toLowerCase()
  if (trimmed.endsWith('min')) return { type: 'time', val: parseInt(trimmed) * 60 }
  if (trimmed.endsWith('s')) return { type: 'time', val: parseInt(trimmed) }
  return { type: 'reps', val: parseInt(trimmed) || 12 }
}
