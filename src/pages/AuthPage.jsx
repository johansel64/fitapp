import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    if (mode === 'register' && !form.name.trim()) {
      setError('Ingresa tu nombre')
      return false
    }
    if (!form.email.trim()) {
      setError('Ingresa tu email')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Email inválido')
      return false
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validate()) return
    
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) {
          setError(error.message)
          toast.error(error.message)
        }
      } else {
        const { error } = await signUp(form.email, form.password, form.name)
        if (error) {
          setError(error.message)
          toast.error(error.message)
        } else {
          toast.success('Cuenta creada. Revisa tu email para confirmar.')
        }
      }
    } catch (err) {
      setError('Error inesperado')
      toast.error('Error inesperado')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--pr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontSize: 22, fontWeight: 600 }}>F</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--t1)' }}>FitApp</div>
          <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 4 }}>Tu entrenador personal con IA</div>
        </div>

        {/* Toggle */}
        <div className="toggle" style={{ marginBottom: 20 }}>
          <button className={`toggle-btn ${mode === 'login' ? 'on' : ''}`} onClick={() => setMode('login')}>Iniciar sesión</button>
          <button className={`toggle-btn ${mode === 'register' ? 'on' : ''}`} onClick={() => setMode('register')}>Crear cuenta</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre</label>
              <input className="input" type="text" placeholder="Tu nombre" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="tu@email.com" value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña</label>
            <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required minLength={6} />
          </div>

          {error && (
            <div style={{ fontSize: 13, padding: '10px 12px', borderRadius: 'var(--rm)', background: error.startsWith('✓') ? 'var(--gr-l)' : 'var(--pr-l)', color: error.startsWith('✓') ? '#085041' : 'var(--pr-d)' }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}
