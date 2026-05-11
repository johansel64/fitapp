import { useState, useEffect } from 'react'

export default function ExerciseGif({ exerciseName, size = 'small' }) {
  const [gifData, setGifData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!exerciseName) return
    let cancelled = false

    const fetchGif = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/exercise-gif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: exerciseName }),
        })

        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setGifData(data)
      } catch {
        // Silently fail - GIF is optional
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGif()
    return () => { cancelled = true }
  }, [exerciseName])

  if (loading) {
    return (
      <div style={{
        width: size === 'large' ? 200 : 60,
        height: size === 'large' ? 150 : 60,
        borderRadius: 'var(--rm)',
        background: 'var(--surface2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="dots">
          <div className="dot" /><div className="dot" /><div className="dot" />
        </div>
      </div>
    )
  }

  if (!gifData?.gifUrl) return null

  const dimensions = size === 'large'
    ? { width: '100%', height: 200, borderRadius: 'var(--r)' }
    : { width: 60, height: 60, borderRadius: 8 }

  return (
    <img
      src={gifData.gifUrl}
      alt={exerciseName}
      style={{ ...dimensions, objectFit: 'cover' }}
      loading="lazy"
    />
  )
}
