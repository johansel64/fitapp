import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePlans } from '../context/PlansContext'
import { useProgress } from '../hooks/useProgress'
import { supabase } from '../lib/supabase'

// ── Gráfico de línea de peso ──────────────────────
function WeightChart({ history }) {
  const data = history.filter(m => m.weight).slice(0, 10).reverse()
  if (data.length < 2) return (
    <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--t2)' }}>
      Registra al menos 2 mediciones para ver el gráfico
    </div>
  )

  const weights = data.map(d => d.weight)
  const min = Math.min(...weights) - 1
  const max = Math.max(...weights) + 1
  const range = max - min
  const W = 320, H = 100, pad = 20

  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((d.weight - min) / range) * (H - pad * 2),
    weight: d.weight,
    date: new Date(d.recorded_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length-1].x} ${H - pad} L ${points[0].x} ${H - pad} Z`

  const trend = weights[weights.length - 1] - weights[0]
  const trendColor = trend < 0 ? '#2DA06A' : trend > 0 ? '#E35A2A' : '#6B6A65'
  const trendIcon = trend < 0 ? '↓' : trend > 0 ? '↑' : '→'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--t2)' }}>Últimas {data.length} mediciones</div>
        <div style={{ fontSize: 13, fontWeight: 500, color: trendColor }}>
          {trendIcon} {Math.abs(trend).toFixed(1)} kg
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={pad} y1={pad + t * (H - pad * 2)} x2={W - pad} y2={pad + t * (H - pad * 2)}
            stroke="var(--bd)" strokeWidth="0.5" />
        ))}
        {/* Area */}
        <path d={areaD} fill="var(--pr)" opacity="0.08" />
        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--pr)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--pr)" />
            <circle cx={p.x} cy={p.y} r="7" fill="var(--pr)" opacity="0.15" />
            {/* Peso encima del punto */}
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fill="var(--t2)">{p.weight}</text>
          </g>
        ))}
        {/* Fechas */}
        {points.filter((_, i) => i === 0 || i === points.length - 1).map((p, i) => (
          <text key={i} x={p.x} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--t3)">{p.date}</text>
        ))}
      </svg>
    </div>
  )
}

// ── Tarjeta de progreso por medida ───────────────
function ProgressCard({ label, first, last, unit, lowerIsBetter = true }) {
  if (!first || !last) return null
  const diff = last - first
  const isGood = lowerIsBetter ? diff <= 0 : diff >= 0
  const color = diff === 0 ? 'var(--t2)' : isGood ? '#2DA06A' : '#E35A2A'
  const icon = diff === 0 ? '→' : isGood ? '↓' : '↑'

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--rm)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--t1)' }}>
        {last}<span style={{ fontSize: 11, color: 'var(--t2)', marginLeft: 2 }}>{unit}</span>
      </div>
      <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 500 }}>
        {icon} {Math.abs(diff).toFixed(1)} {unit} vs inicio
      </div>
    </div>
  )
}

// ── Input de métrica ─────────────────────────────
function MetricInput({ label, unit, value, onChange }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--rm)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number" step="0.1" value={value} onChange={e => onChange(e.target.value)}
          placeholder="—"
          style={{ flex: 1, border: 'none', background: 'none', fontSize: 20, fontWeight: 500, color: 'var(--t1)', outline: 'none', width: '100%' }}
        />
        <span style={{ fontSize: 12, color: 'var(--t2)', flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  )
}

export default function ProfilePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { myPlans, activePlan } = usePlans()
  const { completedDays } = useProgress(activePlan?.id)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const pct = activePlan ? Math.round((completedDays.length / activePlan.total_days) * 100) : 0

  const [metrics, setMetrics] = useState({ weight: '', waist: '', hips: '', chest: '', arms: '' })
  const [history, setHistory] = useState([])
  const [savingMetrics, setSavingMetrics] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('stats') // stats | register

  useEffect(() => { loadMetrics() }, [])

  const loadMetrics = async () => {
    const { data } = await supabase
      .from('user_metrics').select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  const saveMetrics = async () => {
    if (!metrics.weight && !metrics.waist && !metrics.hips && !metrics.chest && !metrics.arms) return
    setSavingMetrics(true)
    await supabase.from('user_metrics').insert({
      user_id: user.id,
      weight: metrics.weight ? parseFloat(metrics.weight) : null,
      waist: metrics.waist ? parseFloat(metrics.waist) : null,
      hips: metrics.hips ? parseFloat(metrics.hips) : null,
      chest: metrics.chest ? parseFloat(metrics.chest) : null,
      arms: metrics.arms ? parseFloat(metrics.arms) : null,
    })
    await loadMetrics()
    setMetrics({ weight: '', waist: '', hips: '', chest: '', arms: '' })
    setTab('stats')
    setSavingMetrics(false)
  }

  const latest = history[0]
  const first = history[history.length - 1]

  return (
    <div>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-logo">{initials}</div>
        <div><div className="hdr-title">Mi perfil</div><div className="hdr-sub">{user?.email}</div></div>
      </div>

      {/* Avatar */}
      <div style={{ padding: '20px 16px 14px', textAlign: 'center' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--pr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#fff', fontSize: 24, fontWeight: 600 }}>{initials}</div>
        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>{user?.email}</div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px', marginBottom: 16 }}>
        {[['Planes', myPlans.length], ['Días', completedDays.length], ['Progreso', `${pct}%`]].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 'var(--rm)', padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--t1)' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Plan activo */}
      <div className="sec">
        <div className="sec-lbl">Plan activo</div>
        {activePlan ? (
          <div style={{ background: 'var(--surface)', border: '2px solid var(--pr)', borderRadius: 'var(--r)', padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>{activePlan.name}</div>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>{completedDays.length} de {activePlan.total_days} días completados</div>
            <div style={{ height: 6, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--pr)', borderRadius: 3, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--pr)', marginTop: 6, fontWeight: 500 }}>{pct}% completado</div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 10 }}>Sin plan activo</div>
            <button className="btn btn-primary" onClick={() => onNavigate('plans')}>Ver planes</button>
          </div>
        )}
      </div>

      {/* Métricas */}
      <div className="sec" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="sec-lbl" style={{ marginBottom: 0 }}>Métricas corporales</div>
          {history.length > 0 && (
            <div className="toggle" style={{ padding: 2, gap: 2 }}>
              <button className={`toggle-btn ${tab === 'stats' ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setTab('stats')}>Progreso</button>
              <button className={`toggle-btn ${tab === 'register' ? 'on' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setTab('register')}>Registrar</button>
            </div>
          )}
        </div>

        {/* Sin mediciones aún */}
        {history.length === 0 && (
          <div>
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 20, textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📏</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>Sin mediciones aún</div>
              <div style={{ fontSize: 13, color: 'var(--t2)' }}>Registra tus medidas para hacer seguimiento de tu transformación</div>
            </div>
            {/* Form primera vez */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <MetricInput label="Peso" unit="kg" value={metrics.weight} onChange={v => setMetrics(m => ({ ...m, weight: v }))} />
              <MetricInput label="Cintura" unit="cm" value={metrics.waist} onChange={v => setMetrics(m => ({ ...m, waist: v }))} />
              <MetricInput label="Cadera" unit="cm" value={metrics.hips} onChange={v => setMetrics(m => ({ ...m, hips: v }))} />
              <MetricInput label="Pecho" unit="cm" value={metrics.chest} onChange={v => setMetrics(m => ({ ...m, chest: v }))} />
              <MetricInput label="Brazos" unit="cm" value={metrics.arms} onChange={v => setMetrics(m => ({ ...m, arms: v }))} />
            </div>
            <button className="btn btn-primary" onClick={saveMetrics} disabled={savingMetrics}>
              {savingMetrics ? 'Guardando...' : 'Guardar primera medición'}
            </button>
          </div>
        )}

        {/* Tab: Progreso */}
        {history.length > 0 && tab === 'stats' && (
          <div>
            {/* Gráfico de peso */}
            {history.some(m => m.weight) && (
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', marginBottom: 12 }}>📉 Evolución de peso</div>
                <WeightChart history={history} />
              </div>
            )}

            {/* Tarjetas de progreso */}
            {first && latest && first.id !== latest.id && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>
                  Comparando primera medición vs última
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <ProgressCard label="Peso" first={first.weight} last={latest.weight} unit="kg" lowerIsBetter={true} />
                  <ProgressCard label="Cintura" first={first.waist} last={latest.waist} unit="cm" lowerIsBetter={true} />
                  <ProgressCard label="Cadera" first={first.hips} last={latest.hips} unit="cm" lowerIsBetter={true} />
                  <ProgressCard label="Pecho" first={first.chest} last={latest.chest} unit="cm" lowerIsBetter={false} />
                  <ProgressCard label="Brazos" first={first.arms} last={latest.arms} unit="cm" lowerIsBetter={false} />
                </div>
              </div>
            )}

            {/* Última medición */}
            {latest && (
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--rm)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--t2)' }}>
                  Última medición · {new Date(latest.recorded_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
                  {[['Peso', latest.weight, 'kg'], ['Cintura', latest.waist, 'cm'], ['Cadera', latest.hips, 'cm'], ['Pecho', latest.chest, 'cm'], ['Brazos', latest.arms, 'cm']]
                    .filter(([, v]) => v)
                    .map(([l, v, u]) => (
                      <div key={l}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{v}{u}</span>
                        <span style={{ fontSize: 11, color: 'var(--t2)', marginLeft: 3 }}>{l}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Registrar */}
        {history.length > 0 && tab === 'register' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <MetricInput label="Peso" unit="kg" value={metrics.weight} onChange={v => setMetrics(m => ({ ...m, weight: v }))} />
              <MetricInput label="Cintura" unit="cm" value={metrics.waist} onChange={v => setMetrics(m => ({ ...m, waist: v }))} />
              <MetricInput label="Cadera" unit="cm" value={metrics.hips} onChange={v => setMetrics(m => ({ ...m, hips: v }))} />
              <MetricInput label="Pecho" unit="cm" value={metrics.chest} onChange={v => setMetrics(m => ({ ...m, chest: v }))} />
              <MetricInput label="Brazos" unit="cm" value={metrics.arms} onChange={v => setMetrics(m => ({ ...m, arms: v }))} />
            </div>
            <button className="btn btn-primary" onClick={saveMetrics} disabled={savingMetrics}>
              {savingMetrics ? 'Guardando...' : 'Guardar medición'}
            </button>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div className="sec" style={{ marginTop: 16 }}>
        <div className="card" onClick={() => onNavigate('plans')}>
          <div className="card-row"><span style={{ flex: 1, fontSize: 14, color: 'var(--t1)' }}>Mis planes</span><span style={{ color: 'var(--t2)' }}>›</span></div>
        </div>
        <div className="card" onClick={() => onNavigate('exercises')}>
          <div className="card-row"><span style={{ flex: 1, fontSize: 14, color: 'var(--t1)' }}>Mis ejercicios</span><span style={{ color: 'var(--t2)' }}>›</span></div>
        </div>
        <button className="btn btn-secondary" onClick={signOut} style={{ marginTop: 12, color: 'var(--pr-d)' }}>Cerrar sesión</button>
      </div>
    </div>
  )
}