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

INSTRUCCIONES ESTRICTAS:
- Objetivo: ${goal}
- Nivel: ${level}
- Duración: ${duration} días
- Notas: ${extra || 'ninguna'}
- EXACTAMENTE 2 semanas (semana 1 y semana final)
- EXACTAMENTE 5 días por semana (3 entrenamiento, 1 descanso, 1 cardio)
- MÁXIMO 4 ejercicios por sección
- MÁXIMO 2 secciones por día
- Nombres de ejercicios MUY cortos (máx 3 palabras)
- Sin descripciones largas
- "focus" máximo 2 palabras
- "description" máximo 15 palabras
- "name" del plan máximo 3 palabras
- Responde ÚNICAMENTE JSON válido, sin texto, sin markdown`

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
        max_tokens: 4000
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