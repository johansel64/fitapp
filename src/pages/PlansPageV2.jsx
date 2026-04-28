import { useState, useEffect } from 'react'
import { usePlansV2 } from '../hooks/usePlansV2'

export default function PlansPageV2({ onNavigate }) {
  const { myPlans, activePlan, loading, createPlan, deletePlan, setActivePlan, getPublicPlans, toggleLike, getUserLikes } = usePlansV2()
  const [tab, setTab] = useState('mine') // mine | explore
  const [view, setView] = useState('list') // list | create
  const [publicPlans, setPublicPlans] = useState([])
  const [likedIds, setLikedIds] = useState([])
  const [form, setForm] = useState({ name: '', description: '', total_days: 30, is_public: false })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getUserLikes().then(setLikedIds)
    if (tab === 'explore') loadPublic()
  }, [tab])

  const loadPublic = async () => {
    const data = await getPublicPlans(search)
    setPublicPlans(data)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const { data } = await createPlan(form)
    if (data) {
      setSaving(false)
      setView('list')
      // Ir al constructor del plan recién creado
      onNavigate('plan-builder', { planId: data.id })
    }
    setSaving(false)
  }

  const handleLike = async (planId) => {
    const nowLiked = await toggleLike(planId)
    setLikedIds(prev => nowLiked ? [...prev, planId] : prev.filter(x => x !== planId))
    await loadPublic()
  }

  const PlanCard = ({ plan, isOwn = false }) => (
    <div style={{ background: 'var(--surface)', border: activePlan?.id === plan.id ? '2px solid var(--pr)' : '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{plan.name}</div>
          {plan.description && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3, lineHeight: 1.4 }}>{plan.description}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {activePlan?.id === plan.id && <span className="tag tag-primary">Activo</span>}
        <span className="tag">{plan.total_days} días</span>
        {plan.is_public && <span className="tag tag-green">Público</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {activePlan?.id !== plan.id && (
          <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={async () => { await setActivePlan(plan.id); onNavigate('home') }}>
            Activar
          </button>
        )}
        {isOwn && (
          <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onNavigate('plan-builder', { planId: plan.id })}>
            Editar días
          </button>
        )}
        <button onClick={() => !tab === 'mine' ? handleLike(plan.id) : null} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: '0.5px solid var(--bd)', borderRadius: 'var(--rm)', padding: '6px 10px', cursor: 'pointer', color: likedIds.includes(plan.id) ? 'var(--pr)' : 'var(--t2)', fontSize: 13 }}>
          {likedIds.includes(plan.id) ? '❤️' : '🤍'} {plan.likes_count || 0}
        </button>
        {isOwn && (
          <button className="btn btn-secondary btn-sm" style={{ color: 'var(--pr-d)' }} onClick={() => { if (confirm('¿Eliminar plan?')) deletePlan(plan.id) }}>
            Eliminar
          </button>
        )}
      </div>
    </div>
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
          {saving ? 'Creando...' : 'Crear plan y configurar días ›'}
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
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>+ Nuevo</button>
        </div>
      </div>

      <div className="tog" style={{ margin: '10px 16px' }}>
        <button className={`toggle-btn ${tab === 'mine' ? 'on' : ''}`} onClick={() => setTab('mine')}>Mis planes</button>
        <button className={`toggle-btn ${tab === 'explore' ? 'on' : ''}`} onClick={() => setTab('explore')}>Explorar</button>
      </div>

      {tab === 'explore' && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Buscar planes..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadPublic()} style={{ flex: 1 }} />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '0 14px' }} onClick={loadPublic}>🔍</button>
        </div>
      )}

      <div className="sec" style={{ paddingBottom: 80 }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24 }}>Cargando...</div>}

        {tab === 'mine' && (
          <>
            {myPlans.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t2)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500, marginBottom: 4 }}>Sin planes aún</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setView('create')}>Crear primer plan</button>
              </div>
            )}
            {myPlans.map(plan => <PlanCard key={plan.id} plan={plan} isOwn />)}
          </>
        )}

        {tab === 'explore' && (
          <>
            {publicPlans.length === 0 && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 24, fontSize: 13 }}>No hay planes públicos aún</div>}
            {publicPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
          </>
        )}
      </div>
    </div>
  )
}
