import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast])
  const error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast])
  const info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast])

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, removeToast }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--rm)',
              background: toast.type === 'success' ? '#2DA06A' : toast.type === 'error' ? '#E35A2A' : '#185FA5',
              color: '#fff',
              fontSize: 13,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              animation: 'slideIn 0.3s ease',
            }}
          >
            {toast.type === 'success' ? '✓ ' : toast.type === 'error' ? '✕ ' : 'ℹ '}{toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
