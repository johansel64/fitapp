import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await signIn(form.email, form.password)
      if (error) setError(error.message)
    } else {
      if (!form.name) { setError('Ingresa tu nombre'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.name)
      if (error) setError(error.message)
      else setError('✓ Revisa tu email para confirmar tu cuenta')
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
