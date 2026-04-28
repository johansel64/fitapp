import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'

const DEFAULT_EXERCISES = [
  { name: 'Skipping', sec: 'Calentamiento', icon: '🏃', type: 'time', val: 30, rest: 0, sets: 5 },
  { name: 'Band Steps', sec: 'Activación', icon: '💪', type: 'reps', val: 10, rest: 30, sets: 2 },
  { name: 'Caderazo Suelo', sec: 'Activación', icon: '🍑', type: 'reps', val: 12, rest: 30, sets: 2 },
  { name: 'Caderazos con Peso', sec: 'Principal', icon: '🏋️', type: 'reps', val: 10, rest: 60, sets: 5 },
  { name: 'Sentadilla Búlgara', sec: 'Principal', icon: '🦵', type: 'reps', val: 12, rest: 60, sets: 5 },
]

export default function HomePage({ activePlan, onNavigate, darkMode, onToggleDark }) {
  const { user } = useAuth()
  const planId = activePlan?.id
  const totalDays = activePlan?.total_days || 56
  const { completedDays, isDayDone, loading } = useProgress(planId)
  const [calPage, setCalPage] = useState(0)

  const curDay = completedDays.length + 1
  const pct = Math.round((completedDays.length / totalDays) * 100)
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Tú'

  // Calendar pages of 28 days
  const calStart = calPage * 28 + 1
  const calEnd = Math.min(calStart + 27, totalDays)
  const calDays = Array.from({ length: calEnd - calStart + 1 }, (_, i) => calStart + i)

  const sections = [...new Set(DEFAULT_EXERCISES.map(e => e.sec))]

  return (
    <div>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-logo">{(activePlan?.emoji || 'F')}</div>
        <div>
          <div className="hdr-title">{activePlan?.name || 'FitApp'}</div>
          <div className="hdr-sub">Hola, {name} 👋</div>
        </div>
        <div className="hdr-right">
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('plans')}>+ Plan</button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onToggleDark}
            style={{ fontSize: 16 }}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Hero */}
      <div style={{ margin: '12px 16px', background: 'var(--pr)', borderRadius: 'var(--r)', padding: '18px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, opacity: .8, marginBottom: 3 }}>Entrenamiento de hoy</div>
          <div style={{ fontSize: 46, fontWeight: 500, lineHeight: 1 }}>Día {Math.min(curDay, totalDays)}</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>{activePlan?.goal || 'Glúteos, piernas y abs'}</div>
          <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>Día {completedDays.length} de {totalDays} completados</div>
        </div>
        <div style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid rgba(255,255,255,.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 500 }}>{pct}%</div>
          <div style={{ fontSize: 10, opacity: .8 }}>completado</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="sec">
        <div className="sec-lbl">Progreso</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setCalPage(p => Math.max(0, p - 1))} disabled={calPage === 0}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Días {calStart}–{calEnd}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setCalPage(p => p + 1)} disabled={calEnd >= totalDays}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
          {calDays.map(d => (
            <div key={d} style={{
              aspectRatio: 1, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, border: '0.5px solid var(--bd)',
              background: isDayDone(d) ? 'var(--gr)' : d === curDay ? 'var(--pr)' : 'var(--surface)',
              color: isDayDone(d) || d === curDay ? '#fff' : d > curDay ? 'var(--t3)' : 'var(--t1)',
              fontWeight: d === curDay ? 500 : 400,
            }}>{d}</div>
          ))}
        </div>
      </div>

      {/* Today's sections */}
      <div className="sec" style={{ marginTop: 18 }}>
        <div className="sec-lbl">Rutinas de hoy</div>
        {sections.map(sec => {
          const exs = DEFAULT_EXERCISES.filter(e => e.sec === sec)
          return (
            <div key={sec} className="card" onClick={() => onNavigate('player', { exercises: DEFAULT_EXERCISES, startIndex: DEFAULT_EXERCISES.findIndex(e => e.sec === sec), planId, dayNumber: curDay })}>
              <div className="card-row">
                <div className="badge badge-r">R</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{sec}</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 1 }}>{exs.length} ejercicios</div>
                </div>
                <div style={{ color: 'var(--t2)', fontSize: 18 }}>›</div>
              </div>
            </div>
          )
        })}
        <button className="btn btn-primary" onClick={() => onNavigate('player', { exercises: DEFAULT_EXERCISES, startIndex: 0, planId, dayNumber: curDay })}>
          Iniciar entrenamiento
        </button>
      </div>
    </div>
  )
}
