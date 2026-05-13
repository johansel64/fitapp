import { useState, useEffect, useMemo, memo } from 'react'
import { useExercises } from '../hooks/useExercises'
import ExerciseGif from '../components/ExerciseGif'
import { useYouTubeSearch, useDebounce } from '../hooks/useYouTubeSearch'
import { SkeletonCard } from '../components/Skeleton'

const MUSCLES = ['chest', 'back', 'legs', 'glutes', 'shoulders', 'arms', 'core', 'cardio', 'full_body']
const EQUIPMENT = ['none', 'dumbbells', 'barbell', 'machine', 'bands', 'bodyweight']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const MUSCLE_ES = { 
  chest: 'Pecho', back: 'Espalda', legs: 'Piernas', glutes: 'Glúteos',
  shoulders: 'Hombros', arms: 'Brazos', core: 'Core', cardio: 'Cardio', full_body: 'Cuerpo completo' 
}
const EQUIP_ES = { none: 'Sin equipo', dumbbells: 'Mancuernas', barbell: 'Barra', machine: 'Máquina', bands: 'Bandas', bodyweight: 'Peso corporal' }
const DIFF_ES = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }

const MUSCLE_COLORS = {
  chest: '#E35A2A', back: '#185FA5', legs: '#2DA06A', glutes: '#C026D3',
  shoulders: '#D97706', arms: '#DC2626', core: '#0891B2', cardio: '#7C3AED',
  full_body: '#4F46E5',
}

function ExerciseForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || { name: '', description: '', youtube_url: '', muscle_group: '', equipment: 'bodyweight', difficulty: 'beginner', is_public: false })
  const [saving, setSaving] = useState(false)
  const [autoSearching, setAutoSearching] = useState(false)
  const { search: ytSearch } = useYouTubeSearch()
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    if (!form.youtube_url && form.name.trim()) {
      setAutoSearching(true)
      const ytUrl = await ytSearch(form.name)
      if (ytUrl) set('youtube_url', ytUrl)
      setAutoSearching(false)
    }
    await onSave(form)
    setSaving(false)
  }

  return (
    <div style={{ padding: 16 }}>
      <div className="form-group">
        <label className="form-label">Nombre del ejercicio *</label>
        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ej: Sentadilla Búlgara" />
      </div>
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea className="input" style={{ minHeight: 80, resize: 'none' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Cómo se hace, puntos clave..." />
      </div>
      <div className="form-group">
        <label className="form-label">Link de YouTube</label>
        <input className="input" value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
      </div>
      <div className="form-group">
        <label className="form-label">Grupo muscular</label>
        <div className="chip-row">
          {MUSCLES.map(m => <button key={m} className={`chip ${form.muscle_group === m ? 'on' : ''}`} onClick={() => set('muscle_group', m)}>{MUSCLE_ES[m]}</button>)}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Equipo</label>
        <div className="chip-row">
          {EQUIPMENT.map(e => <button key={e} className={`chip ${form.equipment === e ? 'on' : ''}`} onClick={() => set('equipment', e)}>{EQUIP_ES[e]}</button>)}
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Dificultad</label>
        <div className="chip-row">
          {DIFFICULTIES.map(d => <button key={d} className={`chip ${form.difficulty === d ? 'on' : ''}`} onClick={() => set('difficulty', d)}>{DIFF_ES[d]}</button>)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderTop: '0.5px solid var(--bd)', marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>Ejercicio público</div>
          <div style={{ fontSize: 12, color: 'var(--t2)' }}>Otros usuarios pueden usarlo en sus planes</div>
        </div>
        <div onClick={() => set('is_public', !form.is_public)} style={{ width: 44, height: 26, borderRadius: 13, background: form.is_public ? 'var(--pr)' : 'var(--bd)', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: form.is_public ? 21 : 3, transition: 'left .2s' }} />
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || autoSearching || !form.name.trim()}>
        {autoSearching ? 'Buscando video...' : saving ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear ejercicio'}
      </button>
      <button className="btn btn-secondary" style={{ marginTop: 8 }} onClick={onCancel}>Cancelar</button>
    </div>
  )
}

function VideoThumb({ ytId, ex }) {
  const [showVideo, setShowVideo] = useState(false)

  if (!showVideo) {
    return (
      <div
        onClick={() => setShowVideo(true)}
        style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 'var(--r) var(--r) 0 0', overflow: 'hidden', cursor: 'pointer' }}
      >
        <img
          src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
          alt={ex.name}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          loading="lazy"
        />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: '16px solid white', marginLeft: 3 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 'var(--r) var(--r) 0 0', overflow: 'hidden' }}>
      <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; encrypted-media" allowFullScreen />
    </div>
  )
}

const ExerciseCard = memo(({ ex, onLike, liked, onEdit, onDelete, showActions = false }) => {
  const ytId = ex.youtube_url?.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]
  const muscleColor = MUSCLE_COLORS[ex.muscle_group] || 'var(--bd)'

  return (
    <div className="card" style={{ marginBottom: 10, cursor: 'default', borderLeft: `3px solid ${muscleColor}` }}>
      {ytId && <VideoThumb ytId={ytId} ex={ex} />}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {!ytId && <ExerciseGif exerciseName={ex.name} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{ex.name}</div>
            {ex.description && <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4, lineHeight: 1.5 }}>{ex.description}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {ex.muscle_group && <span className="tag">{MUSCLE_ES[ex.muscle_group] || ex.muscle_group}</span>}
          {ex.equipment && <span className="tag">{EQUIP_ES[ex.equipment] || ex.equipment}</span>}
          {ex.difficulty && <span className="tag">{DIFF_ES[ex.difficulty] || ex.difficulty}</span>}
          {ex.is_public && <span className="tag tag-green">Público</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button onClick={() => onLike(ex.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: liked ? 'var(--pr)' : 'var(--t2)', fontSize: 13 }}>
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{ex.likes_count || 0}</span>
          </button>
          {showActions && (
            <>
              <button onClick={() => onEdit(ex)} className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>Editar</button>
              <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(ex.id) }} className="btn btn-secondary btn-sm" style={{ color: 'var(--pr-d)' }}>Eliminar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
})

function PageNav({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(0, page - 2)
  const end = Math.min(totalPages - 1, page + 2)

  if (start > 0) { pages.push(0); if (start > 1) pages.push('...') }
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 1) { if (end < totalPages - 2) pages.push('...'); pages.push(totalPages - 1) }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 4, margin: '16px 0' }}>
      <button className="chip" onClick={() => onPage(page - 1)} disabled={page === 0}>‹</button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '6px 4px', color: 'var(--t3)', fontSize: 13 }}>…</span>
        ) : (
          <button key={p} className={`chip ${p === page ? 'on' : ''}`} onClick={() => onPage(p)} style={{ minWidth: 32, justifyContent: 'center' }}>
            {p + 1}
          </button>
        )
      )}
      <button className="chip" onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1}>›</button>
    </div>
  )
}

export default function ExercisesPage({ onNavigate }) {
  const {
    myExercises, publicExercises,
    totalMyCount, totalPublicCount,
    loading, hasMoreMy, hasMorePub,
    loadMoreMy, loadMorePub, loadPageMy, loadPagePub,
    searchExercises, createExercise, updateExercise, deleteExercise,
    toggleLike, getUserLikes, PAGE_SIZE,
  } = useExercises()

  const [tab, setTab] = useState('explore')
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [likedIds, setLikedIds] = useState([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [results, setResults] = useState(null)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [filterMuscle, setFilterMuscle] = useState('')
  const [page, setPage] = useState(0)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    getUserLikes().then(setLikedIds)
  }, [])

  useEffect(() => {
    setPage(0)
    if ((debouncedSearch || filterMuscle) && tab === 'explore') {
      setSearching(true)
      searchExercises(debouncedSearch, { muscle_group: filterMuscle || undefined }, 0).then(data => {
        setResults(data.data)
        setSearchHasMore(data.hasMore)
        setSearching(false)
      })
    } else if ((debouncedSearch || filterMuscle) && tab === 'mine') {
      setSearching(true)
      searchExercises(debouncedSearch, { muscle_group: filterMuscle || undefined, myOnly: true }, 0).then(data => {
        setResults(data.data)
        setSearchHasMore(data.hasMore)
        setSearching(false)
      })
    } else if (!debouncedSearch && !filterMuscle) {
      setResults(null)
      setSearchHasMore(false)
      setSearching(false)
    }
  }, [debouncedSearch, filterMuscle, tab])

  const isSearching = !!(debouncedSearch || filterMuscle)
  const baseList = results !== null ? results : (tab === 'mine' ? myExercises : publicExercises)
  const totalCount = tab === 'mine' ? totalMyCount : totalPublicCount

  const from = baseList.length > 0 ? page * PAGE_SIZE + 1 : 0
  const to = Math.min((page + 1) * PAGE_SIZE, totalCount)
  const totalPages = Math.max(1, Math.ceil((results !== null ? results.length : totalCount) / PAGE_SIZE))

  const handleLike = async (id) => {
    const nowLiked = await toggleLike(id)
    setLikedIds(prev => nowLiked ? [...prev, id] : prev.filter(x => x !== id))
  }

  const handleCreate = async (form) => {
    await createExercise(form)
    setView('list')
  }

  const handleUpdate = async (form) => {
    await updateExercise(editing.id, form)
    setEditing(null)
    setView('list')
  }

  const handlePage = (newPage) => {
    if (newPage < 0 || newPage >= totalPages) return
    setPage(newPage)

    if (isSearching) {
      setSearching(true)
      const myOnly = tab === 'mine'
      searchExercises(debouncedSearch, { muscle_group: filterMuscle || undefined, myOnly }, newPage).then(data => {
        setResults(data.data)
        setSearchHasMore(data.hasMore)
        setSearching(false)
      })
    } else if (tab === 'mine') {
      loadPageMy(newPage)
    } else {
      loadPagePub(newPage)
    }
  }

  if (view === 'create') return (
    <div>
      <div className="hdr"><button className="btn-ghost" onClick={() => setView('list')}>‹</button><div><div className="hdr-title">Nuevo ejercicio</div></div></div>
      <ExerciseForm onSave={handleCreate} onCancel={() => setView('list')} />
    </div>
  )

  if (view === 'edit' && editing) return (
    <div>
      <div className="hdr"><button className="btn-ghost" onClick={() => setView('list')}>‹</button><div><div className="hdr-title">Editar ejercicio</div></div></div>
      <ExerciseForm initial={editing} onSave={handleUpdate} onCancel={() => { setEditing(null); setView('list') }} />
    </div>
  )

  return (
    <div>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => onNavigate('home')}>‹</button>
        <div>
          <div className="hdr-title">Ejercicios</div>
          <div className="hdr-sub">{tab === 'mine' ? `${totalMyCount} propios` : `${totalPublicCount} públicos`}</div>
        </div>
        <div className="hdr-right">
          <button className="btn btn-primary btn-sm" onClick={() => setView('create')}>+ Nuevo</button>
        </div>
      </div>

      <div className="tog" style={{ margin: '10px 16px' }}>
        <button className={`toggle-btn ${tab === 'explore' ? 'on' : ''}`} onClick={() => { setTab('explore'); setResults(null); setPage(0); setSearch(''); setFilterMuscle('') }}>Explorar</button>
        <button className={`toggle-btn ${tab === 'mine' ? 'on' : ''}`} onClick={() => { setTab('mine'); setResults(null); setPage(0); setSearch(''); setFilterMuscle('') }}>Mis ejercicios</button>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <input className="input" placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%' }} />
        <div className="chip-row" style={{ marginTop: 8 }}>
          <button className={`chip ${filterMuscle === '' ? 'on' : ''}`} onClick={() => setFilterMuscle('')}>Todos</button>
          {MUSCLES.map(m => <button key={m} className={`chip ${filterMuscle === m ? 'on' : ''}`} onClick={() => setFilterMuscle(m)}>{MUSCLE_ES[m]}</button>)}
        </div>
      </div>

      <div className="sec">
        {!isSearching && baseList.length > 0 && totalCount > 0 && (
          <div className="sec-lbl" style={{ marginBottom: 4 }}>
            {from}–{isSearching ? Math.min(to, baseList.length) : Math.min((page + 1) * PAGE_SIZE, totalCount)} de {isSearching ? baseList.length : totalCount}
          </div>
        )}

        {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        {searching && !loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--t2)', fontSize: 13 }}>Buscando...</div>}
        {!loading && !searching && baseList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t2)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💪</div>
            <div style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500, marginBottom: 4 }}>
              {tab === 'mine' ? 'Aún no tienes ejercicios' : 'No se encontraron ejercicios'}
            </div>
            {tab === 'mine' && <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setView('create')}>Crear primer ejercicio</button>}
          </div>
        )}
        {!loading && !searching && baseList.map(ex => (
          <ExerciseCard
            key={ex.id}
            ex={ex}
            liked={likedIds.includes(ex.id)}
            onLike={handleLike}
            showActions={tab === 'mine'}
            onEdit={(ex) => { setEditing(ex); setView('edit') }}
            onDelete={deleteExercise}
          />
        ))}
        {!loading && !searching && (
          <PageNav page={page} totalPages={totalPages} onPage={handlePage} />
        )}
      </div>
    </div>
  )
}
