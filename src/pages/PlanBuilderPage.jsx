import { useState, useEffect } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'
import { useExercises } from '../hooks/useExercises'

const MUSCLE_ES = { chest: 'Pecho', back: 'Espalda', legs: 'Piernas', shoulders: 'Hombros', arms: 'Brazos', core: 'Core', cardio: 'Cardio', full_body: 'Cuerpo completo' }

function ExerciseConfigModal({ pde, onSave, onClose, allExercises }) {
  const isSupersetLeader = pde.superset_group && (!pde.sets || pde.sets === null)
  const isSupersetMember = pde.superset_group && pde.sets != null

  const [config, setConfig] = useState({
    sets: pde.sets || 3,
    reps: pde.reps || '12',
    rest_seconds: pde.rest_seconds || 45,
    note: pde.note || '',
    superset_group: pde.superset_group || null,
  })
  const [repType, setRepType] = useState(pde.reps?.toString().match(/[a-z]/) ? 'time' : 'reps')
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const handleSubmit = () => {
    const finalReps = repType === 'time' && !config.reps.toString().match(/[a-z]/)
      ? `${config.reps}s`
      : config.reps
    onSave({ ...config, reps: finalReps })
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', padding: 20, width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{pde.exercise?.name}</div>
          {pde.superset_group && <span className="tag tag-primary">🔗 Superserie</span>}
        </div>

        {/* Toggle Reps / Tiempo */}
        <div className="sec-lbl">Tipo</div>
        <div className="chip-row" style={{ marginBottom: 14 }}>
          <button className={`chip ${repType === 'reps' ? 'on' : ''}`} onClick={() => setRepType('reps')}>Reps</button>
          <button className={`chip ${repType === 'time' ? 'on' : ''}`} onClick={() => setRepType('time')}>Tiempo</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Series</label>
            <input className="input" type="number" min={1} max={20} value={config.sets} onChange={e => set('sets', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">{repType === 'time' ? 'Tiempo (seg)' : 'Repeticiones'}</label>
            <input className="input" type="number" min={1} value={config.reps} onChange={e => set('reps', e.target.value)} placeholder={repType === 'time' ? '30' : '12'} />
          </div>
          <div>
            <label className="form-label">Descanso (seg)</label>
            <input className="input" type="number" min={0} max={300} value={config.rest_seconds} onChange={e => set('rest_seconds', +e.target.value)} />
          </div>
        </div>

        {/* Nota */}
        <div className="form-group">
          <label className="form-label">📝 Nota (opcional)</label>
          <textarea className="input" style={{ minHeight: 50, resize: 'none' }} value={config.note} onChange={e => set('note', e.target.value)} placeholder="Ej: Superserie con press banca, agarrar mancuernas pesadas..." />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

function SupersetConfigModal({ pde, exercises, onSave, onClose, onRemoveExercise, onAddExercise }) {
  const [config, setConfig] = useState({
    sets: pde.sets || 3,
    reps: pde.reps || '12',
    rest_seconds: pde.rest_seconds || 45,
    note: pde.note || '',
  })
  const [showPicker, setShowPicker] = useState(false)
  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  const handleSubmit = () => {
    onSave(config)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', padding: 20, width: '100%', maxWidth: 430 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>🔗 Superserie</div>
          <span className="tag tag-primary">{exercises.length} ejercicios</span>
        </div>

        {/* Ejercicios del grupo */}
        <div style={{ marginBottom: 14 }}>
          <div className="sec-lbl" style={{ marginBottom: 6 }}>Ejercicios</div>
          {exercises.map((ex, i) => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < exercises.length - 1 ? '0.5px solid var(--bd)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', width: 18 }}>{i + 1}.</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--t1)' }}>{ex.exercise?.name || ex.name || 'Ejercicio'}</span>
              {exercises.length > 1 && (
                <button onClick={() => onRemoveExercise(ex.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
              )}
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowPicker(true)}>+ Agregar ejercicio</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label className="form-label">Series</label>
            <input className="input" type="number" min={1} max={20} value={config.sets} onChange={e => set('sets', +e.target.value)} />
          </div>
          <div>
            <label className="form-label">Repeticiones</label>
            <input className="input" type="number" min={1} value={config.reps} onChange={e => set('reps', e.target.value)} placeholder="12" />
          </div>
          <div>
            <label className="form-label">Descanso entre series (seg)</label>
            <input className="input" type="number" min={0} max={300} value={config.rest_seconds} onChange={e => set('rest_seconds', +e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">📝 Nota (opcional)</label>
          <textarea className="input" style={{ minHeight: 50, resize: 'none' }} value={config.note} onChange={e => set('note', e.target.value)} placeholder="Ej: Superserie de empuje..." />
        </div>

        <button className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onClose}>Cancelar</button>

        {showPicker && (
          <ExercisePickerModal onSelect={(ex) => { onAddExercise(ex); setShowPicker(false) }} onClose={() => setShowPicker(false)} />
        )}
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}>
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
  const { getPlanDays, upsertDay, deleteDay, addExerciseToDay, updateExerciseInDay, removeExerciseFromDay, createSupersetGroup, addExerciseToSuperset, deleteSupersetGroup, myPlans } = usePlansV2()
  const plan = myPlans.find(p => p.id === planId)
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showSupersetPicker, setShowSupersetPicker] = useState(false)
  const [pendingSupersetGroup, setPendingSupersetGroup] = useState(null)
  const [editingPde, setEditingPde] = useState(null)
  const [editingSuperset, setEditingSuperset] = useState(null)
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
    if (editingPde) {
      await updateExerciseInDay(editingPde.id, config)
    } else if (editingSuperset) {
      await updateExerciseInDay(editingSuperset.id, config)
    }
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
    setEditingPde(null)
    setEditingSuperset(null)
  }

  const handleAddExerciseToSuperset = async (exercise) => {
    if (!editingSuperset) return
    await addExerciseToSuperset(selectedDay.id, editingSuperset.superset_group, exercise.id)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  const handleSelectSupersetLeader = async (exercise) => {
    setShowSupersetPicker(false)
    const groupId = pendingSupersetGroup || `ss_${Date.now()}`
    await addExerciseToDay(selectedDay.id, exercise.id, { sets: 3, reps: '12', rest_seconds: 45, superset_group: groupId })
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
    setPendingSupersetGroup(null)
  }

  const handleRemovePde = async (pdeId) => {
    await removeExerciseFromDay(pdeId)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  const handleRemoveFromSuperset = async (pdeId) => {
    await removeExerciseFromDay(pdeId)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  const handleCreateSuperset = async () => {
    if (!selectedDay) return
    const { data: exercise } = await addExerciseToDay(selectedDay.id, null, { sets: 3, reps: '12', rest_seconds: 45 })
    // This is a simplified approach - user adds more exercises via the modal
    await loadDays()
  }

  const handleDeleteSuperset = async (groupId) => {
    if (!confirm('¿Eliminar toda la superserie?')) return
    await deleteSupersetGroup(groupId)
    await loadDays()
    const updated = (await getPlanDays(planId)).find(d => d.id === selectedDay.id)
    setSelectedDay(updated)
  }

  // Agrupar ejercicios por superserie
  const getGroupedExercises = (exercises) => {
    const groups = []
    const seen = new Set()

    for (const ex of exercises) {
      if (seen.has(ex.id)) continue
      if (ex.superset_group) {
        const group = exercises.filter(e => e.superset_group === ex.superset_group)
        groups.push({ type: 'superset', group, groupId: ex.superset_group })
        group.forEach(e => seen.add(e.id))
      } else {
        groups.push({ type: 'exercise', exercise: ex })
        seen.add(ex.id)
      }
    }
    return groups
  }

  const curDay = selectedDay ? days.find(d => d.id === selectedDay.id) : null
  const groupedExercises = curDay ? getGroupedExercises(curDay.exercises || []) : []

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
                <span style={{ color: 'var(--t2)', fontSize: 18 }}>›</span>
              </div>
            </div>

            {selectedDay?.id === day.id && day.type !== 'rest' && (
              <div style={{ border: '0.5px solid var(--bd)', borderTop: 'none', borderRadius: '0 0 var(--r) var(--r)', padding: 12, background: 'var(--surface2)' }}>
                {groupedExercises.map((item, i) => {
                  if (item.type === 'superset') {
                    const leader = item.group.find(p => p.sets != null) || item.group[0]
                    return (
                      <div key={item.groupId} style={{ background: 'var(--surface)', borderRadius: 'var(--rm)', padding: '10px 12px', marginBottom: 8, border: '1px solid var(--pr-l)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr)' }}>🔗 Superserie</span>
                          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{item.group.length} ejercicios</span>
                          <button onClick={() => setEditingSuperset({ ...leader, superset_group: item.groupId })} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 15, marginLeft: 'auto' }}>✏️</button>
                          <button onClick={() => handleDeleteSuperset(item.groupId)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 15 }}>🗑</button>
                        </div>
                        {item.group.map((pde, j) => (
                          <div key={pde.id} style={{ fontSize: 13, color: 'var(--t1)', padding: '2px 0 2px 12px' }}>
                            {j + 1}. {pde.exercise?.name}
                            {pde.note && <span style={{ color: 'var(--t3)', fontSize: 11 }}> — 📝 {pde.note}</span>}
                          </div>
                        ))}
                        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 4 }}>
                          {leader.sets} series × {leader.reps} · {leader.rest_seconds}s descanso entre series
                        </div>
                      </div>
                    )
                  }

                  const pde = item.exercise
                  return (
                    <div key={pde.id} style={{ background: 'var(--surface)', borderRadius: 'var(--rm)', padding: '10px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{pde.exercise?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
                          {pde.sets} series × {pde.reps} · {pde.rest_seconds}s descanso
                          {pde.note && <span> — 📝 {pde.note}</span>}
                        </div>
                      </div>
                      <button onClick={() => setEditingPde(pde)} style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                      <button onClick={() => handleRemovePde(pde.id)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 15 }}>🗑</button>
                    </div>
                  )
                })}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button className="btn btn-secondary" onClick={() => setShowPicker(true)} style={{ flex: 1 }}>+ Ejercicio</button>
                  <button className="btn btn-secondary" onClick={() => {
                    setPendingSupersetGroup(`ss_${Date.now()}`)
                    setShowSupersetPicker(true)
                  }} style={{ flex: 1 }}>🔗 Superserie</button>
                </div>
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
      {showSupersetPicker && <ExercisePickerModal onSelect={handleSelectSupersetLeader} onClose={() => { setShowSupersetPicker(false); setPendingSupersetGroup(null) }} />}
      {editingPde && <ExerciseConfigModal pde={editingPde} onSave={handleUpdatePde} onClose={() => setEditingPde(null)} />}
      {editingSuperset && (
        <SupersetConfigModal
          pde={editingSuperset}
          exercises={days.find(d => d.id === selectedDay?.id)?.exercises?.filter(e => e.superset_group === editingSuperset.superset_group) || []}
          onSave={handleUpdatePde}
          onClose={() => setEditingSuperset(null)}
          onRemoveExercise={handleRemoveFromSuperset}
          onAddExercise={handleAddExerciseToSuperset}
        />
      )}
    </div>
  )
}
