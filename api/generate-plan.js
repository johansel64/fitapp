// api/generate-plan.js
// Usa OpenRouter — gratis, sin tarjeta de crédito
// Modelos gratuitos: openrouter.ai/models?q=free

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { goal, duration, level, extra } = req.body
  if (!goal || !duration || !level) {
    return res.status(400).json({ error: 'Faltan parámetros' })
  }

  const API_KEY = process.env.OPENROUTER_API_KEY
  console.log('KEY:', API_KEY ? 'OK' : 'MISSING')
  if (!API_KEY) {
    return res.status(500).json({ error: 'API key no configurada' })
  }

  const prompt = `Eres un experto entrenador personal. Crea un plan de entrenamiento en JSON con esta estructura exacta:
{
  "name": "Nombre creativo del plan en español",
  "description": "Descripción motivadora de 2 frases",
  "emoji": "un emoji relevante",
  "days": ${duration},
  "level": "${level}",
  "goal": "${goal}",
  "weeks": [
    {
      "week": 1,
      "focus": "Foco de la semana",
      "days": [
        {
          "day": 1,
          "type": "Entrenamiento",
          "name": "Nombre del día",
          "sections": [
            {
              "name": "Calentamiento",
              "exercises": [
                {"name": "Nombre ejercicio", "sets": 3, "reps": "12", "rest": 45, "type": "reps"}
              ]
            },
            {
              "name": "Principal",
              "exercises": [
                {"name": "Nombre ejercicio", "sets": 4, "reps": "10", "rest": 60, "type": "reps"}
              ]
            }
          ]
        },
        {
          "day": 2,
          "type": "Descanso",
          "name": "Recuperación",
          "sections": []
        }
      ]
    }
  ]
}

INSTRUCCIONES:
- Objetivo: ${goal}
- Nivel: ${level}
- Duración total: ${duration} días
- Notas del usuario: ${extra || 'ninguna'}
- Incluye EXACTAMENTE 2 semanas: semana 1 (adaptación) y semana final (intensidad máxima)
- Cada semana debe tener entre 4 y 7 días
- Los días de descanso tienen sections: []
- Para ejercicios con tiempo usa: "type": "time", "seconds": 30 en lugar de reps
- El campo "rest" es en segundos de descanso entre series
- Usa ejercicios en español
- Responde ÚNICAMENTE con el JSON válido, sin texto adicional, sin markdown, sin explicaciones`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FitApp'
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!response.ok) {
      const errData = await response.json()
      console.error('OpenRouter error:', JSON.stringify(errData))
      return res.status(500).json({ error: 'Error de API', details: errData })
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    console.log('Respuesta raw:', text.substring(0, 200))

    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json({ plan: parsed })

  } catch (err) {
    console.error('Error generando plan:', err.message)
    return res.status(500).json({ error: 'Error al generar el plan: ' + err.message })
  }
}