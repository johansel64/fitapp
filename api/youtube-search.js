export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  res.setHeader('Access-Control-Allow-Origin', '*')

  const { query } = req.body
  const API_KEY = process.env.YOUTUBE_API_KEY

  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada' })

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' como hacer ejercicio #shorts')}&type=video&maxResults=5&key=${API_KEY}&relevanceLanguage=es&videoDuration=short&order=relevance`
    const response = await fetch(url)
    const data = await response.json()

    const videoId = data.items?.[0]?.id?.videoId
    if (!videoId) return res.status(404).json({ error: 'No se encontró video' })

    return res.status(200).json({ videoId })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}