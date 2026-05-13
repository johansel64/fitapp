import { useState, useEffect, useCallback, useRef } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'
import TemplatePicker from '../components/TemplatePicker'
import { useDebounce } from '../hooks/useYouTubeSearch'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../context/ToastContext'
import { validatePlanJSON, countImportStats } from '../lib/importPlan'

function PlanCard({ plan, isOwn, activePlanId, likedIds, onActivate, onEdit, onClone, cloning, onLike, onDelete }) {
  return (
    <div style={{ background: 'var(--surface)', border: activePlanId === plan.id ? '2px solid var(--pr)' : '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{plan.name}</div>
          {plan.description && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3, lineHeight: 1.4 }}>{plan.description}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {activePlanId === plan.id && <span className="tag tag-primary">Activo</span>}
        <span className="tag">{plan.total_days} días</span>
        {plan.is_public && <span className="tag tag-green">Público</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {activePlanId !== plan.id && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onActivate}>Activar</button>
        )}
        {isOwn && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onEdit}>Editar días</button>
        )}
        {!isOwn && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onClone} disabled={cloning}>
            {cloning ? 'Copiando...' : '📋 Copiar'}
          </button>
        )}
        <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '0.5px solid var(--bd)', borderRadius: 'var(--rm)', padding: '6px 10px', cursor: 'pointer', color: likedIds.includes(plan.id) ? 'var(--pr)' : 'var(--t2)', fontSize: 13 }}>
          {likedIds.includes(plan.id) ? '❤️' : '🤍'} {plan.likes_count || 0}
        </button>
        {isOwn && (
          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--pr-d)' }} onClick={onDelete}>Eliminar</button>
        )}
      </div>
    </div>
  )
}

export default function PlansPageV2({ onNavigate }) {
  const { myPlans, activePlan, loading, createPlan, deletePlan, setActivePlan, getPublicPlans, toggleLike, getUserLikes, clonePlan, importPlanFromJSON } = usePlansV2()
  const toast = useToast()
  const [tab, setTab] = useState('mine')
  const [view, setView] = useState('list')
  const [publicPlans, setPublicPlans] = useState([])
  const [likedIds, setLikedIds] = useState([])
  const [form, setForm] = useState({ name: '', description: '', total_days: 30, is_public: false })
  const [saving, setSaving] = useState(false)
  const [cloning, setCloning] = useState(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const abortRef = useRef(null)

  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importError, setImportError] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const fileInputRef = useRef(null)

  const loadPublic = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const data = await getPublicPlans(debouncedSearch)
    if (!controller.signal.aborted) setPublicPlans(data)
  }, [debouncedSearch, getPublicPlans])

  useEffect(() => {
    getUserLikes().then(setLikedIds)
  }, [])

  useEffect(() => {
    if (tab === 'explore') loadPublic()
  }, [tab, loadPublic])

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await createPlan(form)
    if (data) {
      setSaving(false)
      setView('list')
      onNavigate('plan-builder', { planId: data.id })
    }
    setSaving(false)
  }

  const handleTemplateCreated = (planId) => {
    setView('list')
    onNavigate('plan-builder', { planId })
  }

  const handleLike = async (planId) => {
    const nowLiked = await toggleLike(planId)
    setLikedIds(prev => nowLiked ? [...prev, planId] : prev.filter(x => x !== planId))
    await loadPublic()
  }

  const handleClone = async (planId, planName) => {
    setCloning(planId)
    const { data, error } = await clonePlan(planId)
    setCloning(null)
    if (error) {
      toast.error('Error al copiar el plan')
      return
    }
    toast.success(`Plan "${planName}" copiado con éxito`)
    onNavigate('plan-builder', { planId: data.id })
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError(null)
    setImportPreview(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target.result)
        const validation = validatePlanJSON(json)
        if (!validation.valid) {
          setImportError(validation.errors.join('\n'))
          setImportJson(null)
          return
        }
        setImportJson(json)
        setImportPreview(countImportStats(json))
      } catch (err) {
        setImportError('Archivo JSON inválido: ' + err.message)
        setImportJson(null)
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importJson) return
    setImporting(true)
    setImportError(null)
    setImportProgress(null)

    const { data, error } = await importPlanFromJSON(importJson, (progress) => {
      setImportProgress(progress)
    })

    setImporting(false)
    if (error) {
      setImportError(error)
      return
    }

    toast.success(`Plan "${data.name}" importado con éxito`)
    setShowImport(false)
    setImportJson(null)
    setImportPreview(null)
    onNavigate('plan-builder', { planId: data.id })
  }

  if (view === 'template') return (
    <TemplatePicker onPlanCreated={handleTemplateCreated} onCancel={() => setView('list')} />
  )

  if (view === 'create') return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => setView('list')}>‹</button>
        <div><div className="hdr-title">Nuevo plan</div></div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="form-group">
          <label className="form-label">Nombre del plan *</label>
          <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Glúteos 30 días" />
        </div>
        <div className="form-group">
          <label className="form-label">Descripción</label>
          <textarea className="input" style={{ minHeight: 70, resize: 'none' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="De qué trata el plan..." />
        </div>
        <div className="form-group">
          <label className="form-label">Duración (días)</label>
          <div className="chip-row">
            {[21, 30, 45, 60, 90].map(d => (
              <button key={d} className={`chip ${form.total_days === d ? 'on' : ''}`} onClick={() => setForm(f => ({ ...f, total_days: d }))}>{d} días</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '0.5px solid var(--bd)', marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>Plan público</div>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>Otros usuarios pueden usarlo</div>
          </div>
          <div onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))} style={{ width: 44, height: 26, borderRadius: 13, background: form.is_public ? 'var(--pr)' : 'var(--bd)', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.is_public ? 21 : 3, transition: 'left .2s' }} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.name.trim()}>
          {saving ? 'Creando...' : 'Crear plan vacío ›'}
        </button>
        <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={() => setView('list')}>Cancelar</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => onNavigate('home')}>‹</button>
        <div><div className="hdr-title">Planes</div><div className="hdr-sub">{myPlans.length} propios</div></div>
        <div className="hdr-right">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>📥 Importar</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setView('template')}>📋 Plantilla</button>
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>+ Nuevo</button>
        </div>
      </div>

      <div className="tog" style={{ margin: '10px 16px' }}>
        <button className={`toggle-btn ${tab === 'mine' ? 'on' : ''}`} onClick={() => setTab('mine')}>Mis planes</button>
        <button className={`toggle-btn ${tab === 'explore' ? 'on' : ''}`} onClick={() => setTab('explore')}>Explorar</button>
      </div>

      {tab === 'explore' && (
        <div style={{ padding: '0 16px 8px' }}>
          <input className="input" placeholder="Buscar planes..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
        </div>
      )}

      <div className="sec" style={{ paddingBottom: 80 }}>
        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}

        {tab === 'mine' && (
          <>
            {myPlans.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t2)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500, marginBottom: 4 }}>Sin planes aún</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={() => setView('template')}>📋 Crear desde plantilla</button>
                  <button className="btn btn-secondary" onClick={() => setView('create')}>+ Crear plan vacío</button>
                </div>
              </div>
            )}
            {myPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} isOwn activePlanId={activePlan?.id} likedIds={likedIds}
                onActivate={async () => { await setActivePlan(plan.id); onNavigate('home') }}
                onEdit={() => onNavigate('plan-builder', { planId: plan.id })}
                onLike={null}
                onDelete={() => { if (confirm('¿Eliminar plan?')) deletePlan(plan.id) }}
              />
            ))}
          </>
        )}

        {tab === 'explore' && (
          <>
            {publicPlans.length === 0 && !loading && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24, fontSize: 13 }}>No hay planes públicos aún</div>}
            {publicPlans.map(plan => (
              <PlanCard key={plan.id} plan={plan} isOwn={false} activePlanId={activePlan?.id} likedIds={likedIds}
                onActivate={async () => { await setActivePlan(plan.id); onNavigate('home') }}
                onClone={() => handleClone(plan.id, plan.name)} cloning={cloning === plan.id}
                onLike={() => handleLike(plan.id)}
              />
            ))}
          </>
        )}
      </div>

      {showImport && (
        <div onClick={() => { if (!importing) setShowImport(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', padding: 20, width: '100%', maxWidth: 430 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>📥 Importar plan desde JSON</div>
              <button onClick={() => { if (!importing) setShowImport(false) }} style={{ background: 'none', border: 'none', color: 'var(--t2)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {!importPreview && !importError && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
                  Selecciona un archivo <code>.json</code> con el formato de rutina
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', marginBottom: 8 }}>
                  📁 Seleccionar archivo
                </button>
              </div>
            )}

            {importError && (
              <div>
                <div style={{ background: 'var(--pr-l)', borderRadius: 'var(--rm)', padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--pr-d)', marginBottom: 4 }}>Error</div>
                  <pre style={{ fontSize: 12, color: 'var(--pr-d)', whiteSpace: 'pre-wrap', margin: 0 }}>{importError}</pre>
                </div>
                <button className="btn btn-secondary" onClick={() => { setImportError(null); setImportPreview(null); setImportJson(null) }} style={{ width: '100%' }}>
                  Intentar con otro archivo
                </button>
              </div>
            )}

            {importPreview && !importError && (
              <div>
                <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 14, marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', marginBottom: 10 }}>{importPreview.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13 }}>
                    <Stat label="Días totales" value={importPreview.totalDays} />
                    <Stat label="Ejercicios únicos" value={importPreview.uniqueExercises} />
                    <Stat label="Días con rutina" value={importPreview.trainingDays} />
                    <Stat label="Bloques de ejercicio" value={importPreview.totalSegments} />
                    <Stat label="Días de descanso" value={importPreview.restDays} />
                    <Stat label="Ejerc. totales" value={importPreview.totalExercises} />
                    {importPreview.emptyDays > 0 && <Stat label="Días pendientes" value={importPreview.emptyDays} />}
                  </div>
                </div>

                {importProgress && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>{importProgress.message}</div>
                    {importProgress.total && (
                      <div style={{ height: 4, background: 'var(--bd)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(importProgress.current / importProgress.total) * 100}%`, background: 'var(--pr)', borderRadius: 2, transition: 'width .3s' }} />
                      </div>
                    )}
                  </div>
                )}

                <button className="btn btn-primary" onClick={handleImport} disabled={importing} style={{ width: '100%' }}>
                  {importing ? 'Importando...' : `Importar plan · ${importPreview.trainingDays + importPreview.restDays + importPreview.emptyDays} días`}
                </button>
                <button className="btn btn-secondary" onClick={() => { setImportJson(null); setImportPreview(null); setImportError(null) }} disabled={importing} style={{ width: '100%', marginTop: 8 }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <span style={{ color: 'var(--t2)' }}>{label}: </span>
      <span style={{ fontWeight: 500, color: 'var(--t1)' }}>{value}</span>
    </div>
  )
}
