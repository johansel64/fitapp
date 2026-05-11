import { useCallback } from 'react'
import { useToast } from '../context/ToastContext'

export function useApi() {
  const toast = useToast()

  const call = useCallback(async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error del servidor' }))
        throw new Error(err.error || err.message || 'Error desconocido')
      }

      return await res.json()
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }, [toast])

  const callSilent = useCallback(async (url, options = {}) => {
    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error del servidor' }))
        throw new Error(err.error || err.message || 'Error desconocido')
      }

      return await res.json()
    } catch (err) {
      throw err
    }
  }, [])

  return { call, callSilent }
}
