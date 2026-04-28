import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { usePlansV2 } from '../hooks/usePlansV2'

const MUSCLE_ICONS = { chest: '💪', back: '🏋️', legs: '🦵', glutes: '🍑', shoulders: '🔝', arms: '💪', core: '🔥', cardio: '🏃', full_body: '⚡', default: '💪' }

export default function HomePage({ activePlan, onNavigate, darkMode, onToggleDark }) {
  const { user } = useAuth()
  const { getPlanDays } = usePlansV2()
  const planId = activePlan?.id
  const totalDays = activePlan?.total_days || 30
  const { completedDays, isDayDone, loading } = useProgress(planId)
  const [calPage, setCalPage] = useState(0)
  const [todayDayData, setTodayDayData] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)

  const curDay = completedDays.length + 1
  const pct = Math.round((completedDays.length / totalDays) * 100)
  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Tú'

  const calStart = calPage * 28 + 1
  const calEnd = Math.min(calStart + 27, totalDays)
  const calDays = Array.from({ length: calEnd - calStart + 1 }, (_, i) => calStart + i)
  const [selectedDay, setSelectedDay] = useState(null)

  // Cargar ejercicios del día actual desde el plan
  useEffect(() => {
    if (planId) loadTodayExercises()
  }, [planId, curDay])

  useEffect(() => {
    if (planId) loadDayExercises(selectedDay || curDay)
  }, [planId, curDay, selectedDay])

  const loadDayExercises = async (dayNum) => {
    setLoadingDay(true)
    const days = await getPlanDays(planId)
    const day = days.find(d => d.day_number === dayNum)
    setTodayDayData(day || null)
    setLoadingDay(false)
  }

  const loadTodayExercises = async () => {
    setLoadingDay(true)
    const days = await getPlanDays(planId)
    const today = days.find(d => d.day_number === curDay)
    setTodayDayData(today || null)
    setLoadingDay(false)
  }

  // Convertir ejercicios del plan al formato del player
  const buildPlayerExercises = (pdes = []) => {
    return pdes.map(pde => ({
      name: pde.exercise?.name || 'Ejercicio',
      sec: pde.exercise?.muscle_group || 'Principal',
      icon: MUSCLE_ICONS[pde.exercise?.muscle_group] || MUSCLE_ICONS.default,
      type: pde.duration_seconds ? 'time' : 'reps',
      val: pde.duration_seconds || parseInt(pde.reps) || 12,
      rest: pde.rest_seconds || 45,
      sets: pde.sets || 3,
      youtube_url: pde.exercise?.youtube_url || null,
    }))
  }

  const todayExercises = buildPlayerExercises(todayDayData?.exercises || [])
  const isRestDay = todayDayData?.type === 'rest'
  const hasPlan = !!activePlan
  const hasExercises = todayExercises.length > 0

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div className="hdr">
        <div className="hdr-logo">F</div>
        <div>
          <div className="hdr-title">{activePlan?.name || 'FitApp'}</div>
          <div className="hdr-sub">Hola, {name} 👋</div>
        </div>
        <div className="hdr-right">
          <button onClick={onToggleDark} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('plans')}>Planes</button>
        </div>
      </div>

      {/* Sin plan activo */}
      {!hasPlan && (
        <div style={{ margin: 16, background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏋️</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)', marginBottom: 6 }}>Sin plan activo</div>
          <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16 }}>Crea o activa un plan para empezar a entrenar</div>
          <button className="btn btn-primary" onClick={() => onNavigate('plans')}>Ver planes</button>
        </div>
      )}

      {/* Hero */}
      {hasPlan && (
        <div style={{ margin: '12px 16px', background: isRestDay ? 'var(--gr)' : 'var(--pr)', borderRadius: 'var(--r)', padding: '18px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, opacity: .8, marginBottom: 3 }}>
              {isRestDay ? 'Día de descanso' : 'Entrenamiento de hoy'}
            </div>
            <div style={{ fontSize: 46, fontWeight: 500, lineHeight: 1 }}>Día {Math.min(curDay, totalDays)}</div>
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 4 }}>
              {isRestDay ? '😴 Descansa y recuperate' : activePlan?.name}
            </div>
            <div style={{ fontSize: 11, opacity: .75, marginTop: 2 }}>
              {completedDays.length} de {totalDays} días completados
            </div>
          </div>
          <div style={{ width: 68, height: 68, borderRadius: '50%', border: '3px solid rgba(255,255,255,.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500 }}>{pct}%</div>
            <div style={{ fontSize: 10, opacity: .8 }}>completado</div>
          </div>
        </div>
      )}

      {/* Calendario */}
      {hasPlan && (
        <div className="sec">
          <div className="sec-lbl">Progreso</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setCalPage(p => Math.max(0, p - 1))} disabled={calPage === 0}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Días {calStart}–{calEnd}</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setCalPage(p => p + 1)} disabled={calEnd >= totalDays}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
            {calDays.map(d => (
              <div
                key={d}
                onClick={() => setSelectedDay(d === curDay ? null : d)}
                style={{
                  aspectRatio: 1, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, border: selectedDay === d ? '2px solid var(--pr)' : '0.5px solid var(--bd)',
                  background: isDayDone(d) ? 'var(--gr)' : d === curDay ? 'var(--pr)' : selectedDay === d ? 'var(--pr-l)' : 'var(--surface)',
                  color: isDayDone(d) || d === curDay ? '#fff' : selectedDay === d ? 'var(--pr-d)' : d > curDay ? 'var(--t3)' : 'var(--t1)',
                  fontWeight: d === curDay || selectedDay === d ? 500 : 400,
                  cursor: 'pointer',
                }}
              >{d}</div>
            ))}
          </div>
        </div>
      )}

      {/* Ejercicios de hoy */}
      {hasPlan && !isRestDay && (
        <div className="sec" style={{ marginTop: 18 }}>
          <div className="sec-lbl">
            {selectedDay && selectedDay !== curDay ? `Día ${selectedDay}` : 'Ejercicios de hoy'}
            {selectedDay && selectedDay !== curDay && (
              <button onClick={() => setSelectedDay(null)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--pr)', cursor: 'pointer', fontSize: 11 }}>
                Ver hoy ×
              </button>
            )}
          </div>

          {loadingDay && <div style={{ textAlign: 'center', color: 'var(--t2)', padding: 20, fontSize: 13 }}>Cargando...</div>}

          {!loadingDay && !hasExercises && (
            <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
                El día {curDay} no tiene ejercicios configurados aún
              </div>
              <button className="btn btn-secondary" onClick={() => onNavigate('plan-builder', { planId })}>
                Configurar día {curDay}
              </button>
            </div>
          )}

          {!loadingDay && hasExercises && (
            <>
              {todayExercises.map((ex, i) => (
                <div key={i} className="card" onClick={() => onNavigate('player', { exercises: todayExercises, startIndex: i, planId, dayNumber: curDay })}>
                  <div className="card-row">
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--pr-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {ex.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)' }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 1 }}>
                        {ex.sets} series × {ex.type === 'time' ? `${ex.val}s` : `${ex.val} reps`}
                        {ex.rest > 0 ? ` · ${ex.rest}s descanso` : ''}
                      </div>
                    </div>
                    <div style={{ color: 'var(--t2)', fontSize: 18 }}>›</div>
                  </div>
                </div>
              ))}
              <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => onNavigate('player', { exercises: todayExercises, startIndex: 0, planId, dayNumber: curDay })}>
                Iniciar entrenamiento
              </button>
            </>
          )}
        </div>
      )}

      {/* Día de descanso */}
      {hasPlan && isRestDay && (
        <div className="sec" style={{ marginTop: 18 }}>
          <div style={{ background: 'var(--gr-l)', borderRadius: 'var(--r)', padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>😴</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#085041', marginBottom: 4 }}>Día de descanso</div>
            <div style={{ fontSize: 13, color: '#3B6D11' }}>Tu cuerpo necesita recuperarse. Descansa bien hoy.</div>
          </div>
        </div>
      )}
    </div>
  )
}