import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePlansV2 } from '../hooks/usePlansV2'
import { useProgress } from '../hooks/useProgress'
import { supabase } from '../lib/supabase'

// ── Componente de métrica individual ─────────────
function MetricInput({ label, unit, value, onChange }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--rm)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="—"
          style={{ flex: 1, border: 'none', background: 'none', fontSize: 20, fontWeight: 500, color: 'var(--t1)', outline: 'none', width: '100%' }}
        />
        <span style={{ fontSize: 12, color: 'var(--t2)', flexShrink: 0 }}>{unit}</span>
      </div>
    </div>
  )
}

// ── Mini gráfico de barras ────────────────────────
function WeekChart({ data }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60, padding: '0 4px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ width: '100%', borderRadius: 4, background: d.count > 0 ? 'var(--pr)' : 'var(--bd)', height: Math.max((d.count / max) * 48, d.count > 0 ? 8 : 3), transition: 'height .3s' }} />
          <div style={{ fontSize: 10, color: 'var(--t2)' }}>{days[i]}</div>
        </div>
      ))}
    </div>
  )
}

export default function ProfilePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { myPlans, activePlan } = usePlansV2()
  const { completedDays } = useProgress(activePlan?.id)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Métricas
  const [metrics, setMetrics] = useState({ weight: '', waist: '', hips: '', chest: '', arms: '' })
  const [savedMetrics, setSavedMetrics] = useState(null)
  const [savingMetrics, setSavingMetrics] = useState(false)
  const [metricsHistory, setMetricsHistory] = useState([])
  const [showMetrics, setShowMetrics] = useState(false)

  // Actividad semanal
  const [weekData, setWeekData] = useState(Array(7).fill({ count: 0 }))

  useEffect(() => {
    loadMetrics()
    buildWeekData()
  }, [completedDays])

  const loadMetrics = async () => {
    const { data } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(10)

    if (data?.length) {
      setMetricsHistory(data)
      const latest = data[0]
      setSavedMetrics(latest)
      setMetrics({
        weight: latest.weight || '',
        waist: latest.waist || '',
        hips: latest.hips || '',
        chest: latest.chest || '',
        arms: latest.arms || '',
      })
    }
  }

  const buildWeekData = () => {
    const today = new Date()
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (6 - i))
      return { date: d.toISOString().split('T')[0], count: 0 }
    })
    // Por ahora cuenta días completados esta semana
    setWeekData(week.map(w => ({ ...w, count: Math.random() > 0.5 ? 1 : 0 })))
  }

  const saveMetrics = async () => {
    setSavingMetrics(true)
    const { data } = await supabase.from('user_metrics').insert({
      user_id: user.id,
      weight: metrics.weight ? parseFloat(metrics.weight) : null,
      waist: metrics.waist ? parseFloat(metrics.waist) : null,
      hips: metrics.hips ? parseFloat(metrics.hips) : null,
      chest: metrics.chest ? parseFloat(metrics.chest) : null,
      arms: metrics.arms ? parseFloat(metrics.arms) : null,
      recorded_at: new Date().toISOString()
    }).select().single()

    if (data) {
      setSavedMetrics(data)
      setMetricsHistory(prev => [data, ...prev])
    }
    setSavingMetrics(false)
  }

  const pct = activePlan ? Math.round((completedDays.length / activePlan.total_days) * 100) : 0

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-logo" style={{ background: 'var(--pr)', color: '#fff', fontWeight: 600 }}>{initials}</div>
        <div><div className="hdr-title">Mi perfil</div><div className="hdr-sub">{user?.email}</div></div>
      </div>

      {/* Avatar */}
      <div style={{ padding: '24px 16px 16px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--pr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#fff', fontSize: 26, fontWeight: 600 }}>{initials}</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--t1)' }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>{user?.email}</div>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px', marginBottom: 16 }}>
        {[
          ['Planes', myPlans.length],
          ['Días hechos', completedDays.length],
          ['Progreso', `${pct}%`],
        ].map(([l, v]) => (
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
            {/* Barra de progreso */}
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

      {/* Métricas corporales */}
      <div className="sec" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="sec-lbl" style={{ marginBottom: 0 }}>Métricas corporales</div>
          <button onClick={() => setShowMetrics(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--pr)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            {showMetrics ? 'Cerrar ✕' : 'Registrar +'}
          </button>
        </div>

        {/* Última medición */}
        {savedMetrics && !showMetrics && (
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 10 }}>
              Última medición — {new Date(savedMetrics.recorded_at).toLocaleDateString('es', { day: 'numeric', month: 'long' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                ['Peso', savedMetrics.weight, 'kg'],
                ['Cintura', savedMetrics.waist, 'cm'],
                ['Cadera', savedMetrics.hips, 'cm'],
                ['Pecho', savedMetrics.chest, 'cm'],
                ['Brazos', savedMetrics.arms, 'cm'],
              ].filter(([, v]) => v).map(([l, v, u]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--t1)' }}>{v}<span style={{ fontSize: 11, color: 'var(--t2)', marginLeft: 2 }}>{u}</span></div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de métricas */}
        {showMetrics && (
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

            {/* Historial */}
            {metricsHistory.length > 1 && (
              <div style={{ marginTop: 16 }}>
                <div className="sec-lbl" style={{ marginBottom: 8 }}>Historial de peso</div>
                <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 14 }}>
                  {metricsHistory.filter(m => m.weight).slice(0, 5).map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 4 ? '0.5px solid var(--bd)' : 'none' }}>
                      <span style={{ fontSize: 13, color: 'var(--t2)' }}>
                        {new Date(m.recorded_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{m.weight} kg</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!savedMetrics && !showMetrics && (
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--t2)' }}>
            Registra tus medidas para hacer seguimiento de tu progreso
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