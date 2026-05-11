import { useState, useEffect, useCallback } from 'react'

export function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export function useYouTubeSearch() {
  const [searching, setSearching] = useState(false)

  const search = useCallback(async (exerciseName) => {
    if (!exerciseName) return null
    setSearching(true)
    try {
      const res = await fetch('/api/youtube-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: exerciseName }),
      })

      if (!res.ok) return null
      const data = await res.json()
      return data.videoId ? `https://www.youtube.com/watch?v=${data.videoId}` : null
    } catch {
      return null
    } finally {
      setSearching(false)
    }
  }, [])

  return { search, searching }
}
