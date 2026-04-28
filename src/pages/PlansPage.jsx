import { useState } from 'react'
import { usePlans } from '../hooks/usePlans'

const GOALS = ['Pérdida de grasa', 'Abdomen plano', 'Glúteos y piernas', 'Fuerza general', 'Masa muscular', 'Flexibilidad']
const DURATIONS = ['21', '30', '45', '56']
const LEVELS = ['Principiante', 'Intermedio', 'Avanzado']

export default function PlansPage({ onNavigate, onPlanSelected }) {
  const { plans, activePlan, createPlan, setActivePlan, deletePlan, loading } = usePlans()
  const [view, setView] = useState('list')
  const [goal, setGoal] = useState('Pérdida de grasa')
  const [duration, setDuration] = useState('30')
  const [level, setLevel] = useState('Principiante')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedPlan, setGeneratedPlan] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const generatePlan = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, duration, level, extra })
      })
      const data = await res.json()
      if (!res.ok || !data.plan) throw new Error(data.error || 'Error desconocido')
      setGeneratedPlan(data.plan)
      setView('preview')
    } catch (e) {
      setError('Error: ' + (e.message || 'Intenta de nuevo'))
    }
    setGenerating(false)
  }

  const adoptPlan = async () => {
    if (!generatedPlan) return
    setSaving(true)
    const saved = await createPlan(generatedPlan)
    if (saved) {
      await setActivePlan(saved.id)
      onPlanSelected && onPlanSelected(saved)
      onNavigate('home')
    }
    setSaving(false)
  }

  if (view === 'generate') return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => setView('list')}>‹</button>
        <div><div className="hdr-title">Generar plan con IA</div><div className="hdr-sub">Personalizado para ti · Gratis</div></div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16 }}>
          <div className="form-label" style={{ marginBottom: 8 }}>Objetivo</div>
          <div className="chip-row">
            {GOALS.map(g => <button key={g} className={`chip ${goal === g ? 'on' : ''}`} onClick={() => setGoal(g)}>{g}</button>)}
          </div>
          <div className="form-label" style={{ marginBottom: 8 }}>Duración</div>
          <div className="chip-row">
            {DURATIONS.map(d => <button key={d} className={`chip ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>{d} días</button>)}
          </div>
          <div className="form-label" style={{ marginBottom: 8 }}>Nivel</div>
          <div className="chip-row">
            {LEVELS.map(l => <button key={l} className={`chip ${level === l ? 'on' : ''}`} onClick={() => setLevel(l)}>{l}</button>)}
          </div>
          <div className="form-label" style={{ marginBottom: 6 }}>Notas adicionales (opcional)</div>
          <textarea className="input" style={{ resize: 'none', minHeight: 70, marginBottom: 12 }} placeholder="Ej: sin equipo, 30 min por día, tengo rodilla lastimada..." value={extra} onChange={e => setExtra(e.target.value)} />
          {error && <div style={{ fontSize: 13, color: 'var(--pr-d)', background: 'var(--pr-l)', padding: '10px 12px', borderRadius: 'var(--rm)', marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary" onClick={generatePlan} disabled={generating}>
            {generating
              ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>Generando...<span className="dots" style={{ margin: 0 }}><span className="dot" /><span className="dot" /><span className="dot" /></span></span>
              : 'Generar plan ›'}
          </button>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>Powered by Google Gemini · Gratis</div>
        </div>
      </div>
    </div>
  )

  if (view === 'preview' && generatedPlan) return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => setView('generate')}>‹</button>
        <div><div className="hdr-title">Tu plan generado</div><div className="hdr-sub">Revisa y adopta</div></div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 40 }}>{generatedPlan.emoji}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--t1)' }}>{generatedPlan.name}</div>
            <div style={{ fontSize: 13, color: 'var(--t2)' }}>{generatedPlan.days} días · {generatedPlan.level}</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 18 }}>{generatedPlan.description}</div>
        {(generatedPlan.weeks || []).map(wk => (
          <div key={wk.week} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', marginBottom: 8 }}>Semana {wk.week} — {wk.focus}</div>
            <div style={{ border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {(wk.days || []).map((day, i) => (
                <div key={i} style={{ borderBottom: i < wk.days.length - 1 ? '0.5px solid var(--bd)' : 'none' }}>
                  <div style={{ padding: '10px 14px', background: 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Día {day.day} · {day.name}</span>
                    <span className={`tag ${day.type === 'Descanso' ? 'tag-green' : 'tag-primary'}`}>{day.type}</span>
                  </div>
                  {(day.sections || []).map((sec, j) => (
                    <div key={j} style={{ padding: '8px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)', textTransform: 'uppercase', marginBottom: 4 }}>{sec.name}</div>
                      {(sec.exercises || []).map((ex, k) => (
                        <div key={k} style={{ fontSize: 13, color: 'var(--t2)', padding: '3px 0', borderBottom: k < sec.exercises.length - 1 ? '0.5px solid var(--bd)' : 'none' }}>
                          {ex.name} — {ex.sets} × {ex.type === 'time' ? `${ex.seconds}s` : `${ex.reps} reps`}{ex.rest > 0 ? ` · ${ex.rest}s descanso` : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="btn btn-primary" onClick={adoptPlan} disabled={saving}>{saving ? 'Guardando...' : 'Adoptar este plan ✓'}</button>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setView('generate')}>Regenerar</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => onNavigate('home')}>‹</button>
        <div><div className="hdr-title">Mis planes</div><div className="hdr-sub">{plans.length} plan{plans.length !== 1 ? 'es' : ''} guardado{plans.length !== 1 ? 's' : ''}</div></div>
      </div>
      <div className="sec" style={{ marginTop: 12, paddingBottom: 24 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24 }}>Cargando...</div>}
        {!loading && plans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t2)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>Sin planes aún</div>
            <div style={{ fontSize: 13 }}>Genera tu primer plan personalizado con IA</div>
          </div>
        )}
        {plans.map(plan => (
          <div key={plan.id} style={{ background: 'var(--surface)', border: plan.is_active ? '2px solid var(--pr)' : '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 32 }}>{plan.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2, lineHeight: 1.4 }}>{plan.description}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {plan.is_active && <span className="tag tag-primary">Activo</span>}
              <span className="tag">{plan.total_days} días</span>
              <span className="tag">{plan.level}</span>
              {plan.goal && <span className="tag">{plan.goal}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {!plan.is_active && (
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={async () => { await setActivePlan(plan.id); onPlanSelected && onPlanSelected(plan); onNavigate('home') }}>Activar</button>
              )}
              <button className="btn btn-secondary" style={{ flex: 1, color: 'var(--pr-d)' }} onClick={() => { if (confirm('¿Eliminar este plan?')) deletePlan(plan.id) }}>Eliminar</button>
            </div>
          </div>
        ))}
        <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => setView('generate')}>+ Generar plan con IA</button>
      </div>
    </div>
  )
}
