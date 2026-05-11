export const DURATIONS = [21, 30, 45, 60]

export const WARMUP_EXERCISES = [
  { name: 'Rotación de articulaciones', muscle_group: 'full_body', equipment: 'bodyweight', difficulty: 'beginner', sets: 1, reps: '30s', rest_seconds: 10 },
  { name: 'Jumping jacks', muscle_group: 'cardio', equipment: 'bodyweight', difficulty: 'beginner', sets: 1, reps: '20', rest_seconds: 15 },
  { name: 'Sentadillas ligeras', muscle_group: 'legs', equipment: 'bodyweight', difficulty: 'beginner', sets: 1, reps: '15', rest_seconds: 15 },
]

export function getDayType(dayNumber) {
  const dayOfWeek = (dayNumber - 1) % 7
  return dayOfWeek < 5 ? 'training' : 'rest'
}

export function getDayName(dayNumber) {
  const dayOfWeek = (dayNumber - 1) % 7
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  return names[dayOfWeek]
}

export function getDayLabel(dayNumber) {
  const type = getDayType(dayNumber)
  const name = getDayName(dayNumber)
  return type === 'rest' ? `${name} - Descanso` : `${name} - Entrenamiento`
}
