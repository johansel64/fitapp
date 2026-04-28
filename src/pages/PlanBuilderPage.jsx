import { useState, useEffect } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'
import { useExercises } from '../hooks/useExercises'

const MUSCLE_ES = { chest: 'Pecho', back: 'Espalda', legs: 'Piernas', shoulders: 'Hombros', arms: 'Brazos', core: 'Core', cardio: 'Cardio', full_body: 'Cuerpo completo' }

function ExerciseConfigModal({ pde, onSave, onClose }) {
  const [config, setConfig] = useState({ sets: pde.sets, reps: pde.reps, rest_seconds: pde.rest_seconds, duration_seconds: pde.duration_seconds || '' })
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', padding: 20, width: '100%', maxWidth: 430 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)', marginBottom: 16 }}>{pde.exercise?.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Series</label>
            <input className="input" type="number" min={1} max={20} value={config.sets} onChange={e => set('sets', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">Reps / tiempo</label>
            <input className="input" value={config.reps} onChange={e => set('reps', e.target.value)} placeholder="12 o 30s" />
          </div>
          <div>
            <label className="form-label">Descanso (seg)</label>
            <input className="input" type="number" min={0} max={300} value={config.rest_seconds} onChange={e => set('rest_seconds', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">Duración (seg)</label>
            <input className="input" type="number" min={0} value={config.duration_seconds} onChange={e => set('duration_seconds', e.target.value ? +e.target.value : null)} placeholder="Solo si es por tiempo" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { onSave(config); onClose() }}>Guardar</button>
      </div>
    </div>
  )
}

function ExercisePickerModal({ onSelect, onClose }) {
  const { searchExercises, myExercises } = useExercises()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(myExercises)

  const handleSearch = async () => {
    const data = await searchExercises(query)
    setResults(data)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', width: '100%', maxWidth: 430, margin: '0 auto', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 16px 8px', borderBottom: '0.5px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>Agregar ejercicio</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input" placeholder="Buscar..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ width: 'auto', padding: '0 14px' }} onClick={handleSearch}>🔍</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 12 }}>
          {results.map(ex => (
            <div key={ex.id} onClick={() => onSelect(ex)} style={{ padding: '11px 14px', borderRadius: 'var(--rm)', border: '0.5px solid var(--bd)', marginBottom: 8, cursor: 'pointer', background: 'var(--surface)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{ex.name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                {ex.muscle_group && <span className="tag">{MUSCLE_ES[ex.muscle_group] || ex.muscle_group}</span>}
                {ex.is_public && <span className="tag tag-green">Público</span>}
              </div>
            </div>
          ))}
          {results.length === 0 && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24, fontSize: 13 }}>Sin resultados — busca o crea ejercicios primero</div>}
        </div>
      </div>
    </div>
  )
}

export default function PlanBuilderPage({ planId, onNavigate }) {
  const { getPlanDays, upsertDay, deleteDay, addExerciseToDay, updateExerciseInDay, removeExerciseFromDay, myPlans, updatePlan } = usePlansV2()
  const plan = myPlans.find(p => p.id === planId)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [editingPde, setEditingPde] = useState(null)
  const [newDayNum, setNewDayNum] = useState('')

  useEffect(() => {
    if (planId) loadDays()
  }, [planId])

  const loadDays = async () => {
    setLoading(true)
    const data = await getPlanDays(planId)
    setDays(data)
    setLoading(false)
  }

  const handleAddDay = async (type = 'training') => {
    const num = parseInt(newDayNum)
    if (!num || num < 1 || num > 90) return
    const day = await upsertDay(planId, num, type, type === 'rest' ? 'Descanso' : `Día ${num}`)
    if (day) { await loadDays(); setNewDayNum('') }
  }

  const handleRemoveDay = async (dayNumber) => {
    if (!confirm(`¿Eliminar día ${dayNumber}?`)) return
    await deleteDay(planId, dayNumber)
    if (selectedDay?.day_number === dayNumber) setSelectedDay(null)
    await loadDays()
  }

  const handleAddExercise = async (exercise) => {
    if (!selectedDay) return
    setShowPicker(false)
    await addExerciseToDay(selectedDay.id, exercise.id)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  const handleUpdatePde = async (config) => {
    await updateExerciseInDay(editingPde.id, config)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
    setEditingPde(null)
  }

  const handleRemovePde = async (pdeId) => {
    await removeExerciseFromDay(pdeId)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  const curDay = selectedDay ? days.find(d => d.id === selectedDay.id) : null

  return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => onNavigate('plans')}>‹</button>
        <div>
          <div className="hdr-title">{plan?.name || 'Constructor de plan'}</div>
          <div className="hdr-sub">{days.length} días configurados</div>
        </div>
        <div className="hdr-right">
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('plans')}>Listo ✓</button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {/* Agregar día */}
        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 14, marginBottom: 16 }}>
          <div className="sec-lbl" style={{ marginBottom: 10 }}>Agregar día</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="input" type="number" min={1} max={90} placeholder="Nº día (1-90)" value={newDayNum} onChange={e => setNewDayNum(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAddDay('training')}>+ Entrenamiento</button>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleAddDay('rest')}>+ Descanso</button>
          </div>
        </div>

        {/* Lista de días */}
        {loading ? <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24 }}>Cargando...</div> : null}

        {days.map(day => (
          <div key={day.id} style={{ marginBottom: 8 }}>
            <div
              onClick={() => setSelectedDay(selectedDay?.id === day.id ? null : day)}
              style={{ padding: '12px 16px', background: 'var(--surface)', border: selectedDay?.id === day.id ? '2px solid var(--pr)' : '0.5px solid var(--bd)', borderRadius: 'var(--r)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: day.type === 'rest' ? 'var(--gr-l)' : 'var(--pr-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: day.type === 'rest' ? '#085041' : 'var(--pr-d)', flexShrink: 0 }}>
                {day.day_number}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{day.name || `Día ${day.day_number}`}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                  {day.type === 'rest' ? 'Descanso' : `${day.exercises?.length || 0} ejercicio${day.exercises?.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); handleRemoveDay(day.day_number) }} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16 }}>🗑</button>
                <span style={{ color: 'var(--t2)', fontSize: 18 }}>{selectedDay?.id === day.id ? '›' : '›'}</span>
              </div>
            </div>

            {/* Ejercicios del día seleccionado */}
            {selectedDay?.id === day.id && day.type !== 'rest' && (
              <div style={{ border: '0.5px solid var(--bd)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', padding: 12, background: 'var(--surface2)' }}>
                {(day.exercises || []).map(pde => (
                  <div key={pde.id} style={{ background: 'var(--surface)', borderRadius: 'var(--rm)', padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{pde.exercise?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                        {pde.sets} series × {pde.reps} · {pde.rest_seconds}s descanso
                      </div>
                    </div>
                    <button onClick={() => setEditingPde(pde)} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                    <button onClick={() => handleRemovePde(pde.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 15 }}>🗑</button>
                  </div>
                ))}
                <button className="btn btn-secondary" onClick={() => setShowPicker(true)} style={{ width: '100%', marginTop: 4 }}>+ Agregar ejercicio</button>
              </div>
            )}
          </div>
        ))}

        {days.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t2)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
            <div style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>Sin días configurados</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Agrega el primer día arriba</div>
          </div>
        )}
      </div>

      {showPicker && <ExercisePickerModal onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />}
      {editingPde && <ExerciseConfigModal pde={editingPde} onSave={handleUpdatePde} onClose={() => setEditingPde(null)} />}
    </div>
  )
}
