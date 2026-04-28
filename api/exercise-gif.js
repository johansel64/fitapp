export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Falta nombre' })

  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY
  if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'API key no configurada' })

  const translations = {
    'sentadilla búlgara': 'bulgarian squat',
    'sentadilla sumo': 'sumo squat',
    'sentadilla': 'squat',
    'caderazo': 'hip thrust',
    'caderazos': 'hip thrust',
    'hip thrust': 'hip thrust',
    'skipping': 'jump rope',
    'zancada': 'lunge',
    'plancha': 'plank',
    'flexión': 'push up',
    'flexion': 'push up',
    'abdominal': 'crunch',
    'abdominales': 'crunch',
    'peso muerto': 'deadlift',
    'remo': 'bent over row',
    'curl': 'curl',
    'extensión de cadera': 'hip extension',
    'extensión': 'extension',
    'elevación lateral': 'lateral raise',
    'elevación': 'raise',
    'burpee': 'burpee',
    'salto': 'jump squat',
    'mountain climber': 'mountain climber',
    'band steps': 'lateral walk',
    'puente': 'glute bridge',
    'press': 'press',
    'dominada': 'pull up',
    'fondos': 'dip',
    'patada': 'donkey kick',
    'abducción': 'abduction',
    'estocada': 'lunge',
  }

  let searchTerm = name.toLowerCase()
  for (const [es, en] of Object.entries(translations)) {
    if (searchTerm.includes(es)) { searchTerm = en; break }
  }
  const query = searchTerm.replace(/[^a-z0-9 ]/g, '').trim()
  console.log(`Buscando: "${name}" → "${query}"`)

  const headers = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': 'exercisedb.p.rapidapi.com',
    'Content-Type': 'application/json'
  }

  try {
    // 1. Buscar ejercicio por nombre para obtener el exerciseId
    const searchRes = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/search?query=${encodeURIComponent(query)}&limit=1&offset=0`,
      { headers }
    )

    console.log('Search status:', searchRes.status)
    let exercise = null

    if (searchRes.ok) {
      const searchData = await searchRes.json()
      console.log('Search result:', JSON.stringify(searchData).substring(0, 300))
      exercise = Array.isArray(searchData) ? searchData[0] : searchData?.exercises?.[0]
    }

    // Fallback: listar y buscar por nombre
    if (!exercise) {
      const listRes = await fetch(
        `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(query)}?limit=1&offset=0`,
        { headers }
      )
      if (listRes.ok) {
        const listData = await listRes.json()
        exercise = listData[0]
        // Si no hay resultado, probar primera palabra
        if (!exercise) {
          const word = query.split(' ')[0]
          const r2 = await fetch(
            `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(word)}?limit=1&offset=0`,
            { headers }
          )
          const d2 = await r2.json()
          exercise = d2[0]
        }
      }
    }

    if (!exercise) return res.status(404).json({ error: `No se encontró "${name}"` })

    console.log('Exercise encontrado:', exercise.id, exercise.name)

    // 2. Obtener imagen con el endpoint getExerciseImage
    const imgRes = await fetch(
      `https://exercisedb.p.rapidapi.com/image?exerciseId=${exercise.id}&resolution=360`,
      { headers }
    )

    console.log('Image status:', imgRes.status)

    let gifUrl = exercise.gifUrl || null

    if (imgRes.ok) {
      const contentType = imgRes.headers.get('content-type') || ''
      if (contentType.includes('image')) {
        // Es una imagen directa — la convertimos a base64
        const buffer = await imgRes.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        gifUrl = `data:${contentType};base64,${base64}`
      } else {
        const imgData = await imgRes.json()
        console.log('Image data:', JSON.stringify(imgData).substring(0, 200))
        gifUrl = imgData.url || imgData.gifUrl || imgData.image || exercise.gifUrl
      }
    }

    if (!gifUrl) return res.status(404).json({ error: 'Sin imagen disponible' })

    return res.status(200).json({
      name: exercise.name,
      gifUrl,
      target: exercise.target,
      bodyPart: exercise.bodyPart,
      instructions: (exercise.instructions || []).slice(0, 3)
    })

  } catch (err) {
    console.error('Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
