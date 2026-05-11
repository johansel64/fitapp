import { useState } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'
import { DURATIONS, WARMUP_EXERCISES, getDayName } from '../data/templates'
import { useToast } from '../context/ToastContext'

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getDefaultDayTypes(duration) {
  return Array.from({ length: duration }, (_, i) => {
    const dow = i % 7
    return dow < 5 ? 'training' : 'rest'
  })
}

export default function TemplatePicker({ onPlanCreated, onCancel }) {
  const { createPlanFromTemplate } = usePlansV2()
  const toast = useToast()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    duration: 30,
    warmup: true,
    name: '',
    description: '',
    is_public: false,
  })
  const [dayTypes, setDayTypes] = useState(getDefaultDayTypes(30))
  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleDay = (index) => {
    setDayTypes(prev => {
      const next = [...prev]
      next[index] = next[index] === 'training' ? 'rest' : 'training'
      return next
    })
  }

  const setAllTo = (type) => {
    setDayTypes(Array.from({ length: form.duration }, () => type))
  }

  const setWeekdays = () => {
    setDayTypes(Array.from({ length: form.duration }, (_, i) => {
      const dow = i % 7
      return dow < 5 ? 'training' : 'rest'
    }))
  }

  const handleDurationChange = (d) => {
    set('duration', d)
    const old = dayTypes
    if (d > old.length) {
      const next = [...old]
      for (let i = old.length; i < d; i++) {
        const dow = i % 7
        next.push(dow < 5 ? 'training' : 'rest')
      }
      setDayTypes(next)
    } else {
      setDayTypes(old.slice(0, d))
    }
  }

  const trainingDays = dayTypes.filter(t => t === 'training').length
  const restDays = dayTypes.filter(t => t === 'rest').length

  const handleCreate = async () => {
    setCreating(true)
    setProgress('Creando plan...')

    try {
      const planName = form.name.trim() || `Plan ${form.duration} días`

      setProgress('Creando días...')

      const { data: plan, error } = await createPlanFromTemplate({
        name: planName,
        description: form.description.trim() || null,
        total_days: form.duration,
        is_public: form.is_public,
        warmup: form.warmup,
        dayTypes,
      })

      if (error || !plan) {
        toast.error('Error al crear el plan')
        setCreating(false)
        return
      }

      toast.success(`Plan "${plan.name}" creado con éxito`)
      onPlanCreated(plan.id)
    } catch (err) {
      toast.error('Error: ' + err.message)
      setCreating(false)
    }
  }

  if (step === 0) {
    const weeks = Math.ceil(form.duration / 7)
    const rows = []
    for (let w = 0; w < weeks; w++) {
      const start = w * 7
      const end = Math.min(start + 7, form.duration)
      rows.push({ start, end })
    }

    return (
      <div style={{ padding: 16 }}>
        <div className="hdr">
          <button className="btn-ghost" onClick={onCancel}>‹</button>
          <div>
            <div className="hdr-title">📋 Crear plan desde plantilla</div>
            <div className="hdr-sub">Paso 1: Configura tus días</div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="sec-lbl">Duración</div>
          <div className="chip-row">
            {DURATIONS.map(d => (
              <button
                key={d}
                className={`chip ${form.duration === d ? 'on' : ''}`}
                onClick={() => handleDurationChange(d)}
              >
                {d} días
              </button>
            ))}
          </div>

          {/* Acciones rápidas */}
          <div className="sec-lbl" style={{ marginTop: 16 }}>Patrón rápido</div>
          <div className="chip-row">
            <button className="chip" onClick={setWeekdays}>L-V entreno</button>
            <button className="chip" onClick={() => setAllTo('training')}>Todos entreno</button>
            <button className="chip" onClick={() => setAllTo('rest')}>Todos descanso</button>
          </div>

          {/* Grid de días */}
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Toca para cambiar</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--pr)' }}>🏋️ {trainingDays} entreno</span>
                <span style={{ color: 'var(--gr)' }}>😴 {restDays} descanso</span>
              </div>
            </div>

            {rows.map((row, wi) => (
              <div key={wi} style={{ marginBottom: wi < rows.length - 1 ? 12 : 0 }}>
                {form.duration > 7 && (
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Semana {wi + 1}</div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                  {Array.from({ length: row.end - row.start }, (_, i) => {
                    const idx = row.start + i
                    const type = dayTypes[idx]
                    const dayNum = idx + 1
                    const dayName = DAY_NAMES_SHORT[idx % 7]
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        style={{
                          textAlign: 'center',
                          padding: '8px 2px',
                          borderRadius: 8,
                          background: type === 'training' ? 'var(--pr-l)' : 'var(--gr-l)',
                          color: type === 'training' ? 'var(--pr-d)' : '#085041',
                          cursor: 'pointer',
                          border: type === 'training' ? '1.5px solid var(--pr)' : '1.5px solid var(--gr)',
                          transition: 'all .15s',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div style={{ fontSize: 9, opacity: 0.7 }}>{dayName}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{dayNum}</div>
                        <div style={{ fontSize: 14, marginTop: 2 }}>{type === 'training' ? '🏋️' : '😴'}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => {
              set('name', `Plan ${form.duration} días`)
              setStep(1)
            }}>
              Siguiente ›
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 1) {
    return (
      <div style={{ padding: 16 }}>
        <div className="hdr">
          <button className="btn-ghost" onClick={() => setStep(0)}>‹</button>
          <div>
            <div className="hdr-title">📋 Crear plan desde plantilla</div>
            <div className="hdr-sub">Paso 2: Opciones</div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="form-group">
            <label className="form-label">Nombre del plan</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Plan 30 días" />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción (opcional)</label>
            <textarea className="input" style={{ minHeight: 60, resize: 'none' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="De qué trata el plan..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '0.5px solid var(--bd)', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>Agregar calentamiento básico</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Rotación articular, jumping jacks y sentadillas ligeras</div>
            </div>
            <div onClick={() => set('warmup', !form.warmup)} style={{ width: 44, height: 26, borderRadius: 13, background: form.warmup ? 'var(--pr)' : 'var(--bd)', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.warmup ? 21 : 3, transition: 'left .2s' }} />
            </div>
          </div>

          {form.warmup && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>Ejercicios de calentamiento:</div>
              {WARMUP_EXERCISES.map((ex, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--t1)', padding: '4px 0' }}>
                  • {ex.name} — {ex.reps}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '0.5px solid var(--bd)', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>Plan público</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Otros usuarios pueden usarlo</div>
            </div>
            <div onClick={() => set('is_public', !form.is_public)} style={{ width: 44, height: 26, borderRadius: 13, background: form.is_public ? 'var(--pr)' : 'var(--bd)', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.is_public ? 21 : 3, transition: 'left .2s' }} />
            </div>
          </div>

          {creating && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div className="dots" style={{ marginBottom: 16 }}>
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
              <div style={{ fontSize: 14, color: 'var(--t2)' }}>{progress}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setStep(0)} disabled={creating}>‹ Atrás</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={creating || !form.name.trim()}>
              {creating ? 'Creando...' : 'Crear plan con estructura'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
