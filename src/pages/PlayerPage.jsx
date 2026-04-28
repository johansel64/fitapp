import { useState, useEffect, useRef, useMemo } from 'react'
import { useProgress } from '../hooks/useProgress'

const VideoSection = ({ youtubeUrl, name }) => {
  const ytId = youtubeUrl?.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/\s]+)/)?.[1] || null

  if (!youtubeUrl) return null

  if (ytId) return (
    <div style={{ margin: '0 16px 16px', borderRadius: 'var(--r)', overflow: 'hidden', border: '0.5px solid var(--bd)', background: '#000' }}>
      <iframe
        width="100%"
        height="200"
        src={`https://www.youtube.com/embed/${ytId}`}
        allow="encrypted-media"
        allowFullScreen
        style={{ display: 'block', border: 'none' }}
      />
    </div>
  )

  return (
    <div onClick={() => window.open(youtubeUrl, '_blank')}
      style={{ margin: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', cursor: 'pointer', background: 'var(--surface)', fontSize: 13, color: 'var(--t2)' }}>
      <div style={{ width: 22, height: 16, background: '#FF0000', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '8px solid white' }} />
      </div>
      <span>Ver {name} en YouTube ↗</span>
    </div>
  )
}

export default function PlayerPage({ exercises = [], startIndex = 0, planId, dayNumber, onBack, onComplete }) {
  const { logSeries, completeDay } = useProgress(planId)
  const [exIdx, setExIdx] = useState(startIndex)
  const [series, setSeries] = useState(1)
  const [phase, setPhase] = useState('exercise')
  const [timeLeft, setTimeLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const timerRef = useRef(null)

  const ex = exercises[exIdx]
  const isLast = exIdx === exercises.length - 1 && series === ex?.sets

  useEffect(() => {
    if (ex) {
      setTimeLeft(ex.type === 'time' ? ex.val : 0)
      setRunning(false)
      clearTimer()
    }
  }, [exIdx, series])

  const clearTimer = () => { clearInterval(timerRef.current); timerRef.current = null }

  const startTimer = (secs, onDone) => {
    setRunning(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearTimer(); setRunning(false); onDone(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  const togglePlay = () => {
    if (ex.type === 'reps') { seriesDone(); return }
    if (running) { clearTimer(); setRunning(false) }
    else startTimer(timeLeft, seriesDone)
  }

  const seriesDone = async () => {
    clearTimer(); setRunning(false)
    await logSeries(dayNumber, ex.name, series)
    if (ex.rest > 0 && series < ex.sets) {
      setPhase('rest')
      setTimeLeft(ex.rest)
      startTimer(ex.rest, afterRest)
    } else afterRest()
  }

  const afterRest = () => {
    setPhase('exercise')
    if (series < ex.sets) { setSeries(s => s + 1) }
    else if (exIdx < exercises.length - 1) { setExIdx(i => i + 1); setSeries(1) }
    else { finishWorkout() }
  }

  const skipRest = () => { clearTimer(); setRunning(false); afterRest() }

  const finishWorkout = async () => {
    await completeDay(dayNumber, exercises.map(e => e.name))
    onComplete && onComplete()
    onBack()
  }

  const nextSeries = async () => {
    clearTimer(); setRunning(false); setPhase('exercise')
    await logSeries(dayNumber, ex.name, series)
    if (ex.rest > 0 && series < ex.sets) {
      setPhase('rest'); setTimeLeft(ex.rest)
      startTimer(ex.rest, afterRest)
    } else afterRest()
  }

  const prevSeries = () => {
    clearTimer(); setRunning(false); setPhase('exercise')
    if (series > 1) setSeries(s => s - 1)
    else if (exIdx > 0) { setExIdx(i => i - 1); setSeries(exercises[exIdx - 1].sets) }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  // Extrae el ID de YouTube de cualquier formato de URL
  const getYtId = (url) => url?.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/\s]+)/)?.[1] || null

  if (!ex) return null

  // ── PANTALLA DE DESCANSO ──────────────────────────────────────
  if (phase === 'rest') {
    const nextExercise = series < ex.sets ? ex : exercises[exIdx + 1]

    return (
      <div>
        <div className="hdr">
          <button className="btn-ghost" onClick={skipRest}>‹</button>
          <div>
            <div className="hdr-title">Descanso</div>
            <div className="hdr-sub">{ex.name} · serie {series} completada</div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div className="rest-card">
            <div style={{ fontSize: 18, fontWeight: 500, color: '#085041', marginBottom: 4 }}>Descansa</div>
            <div style={{ fontSize: 13, color: '#3B6D11', marginBottom: 20 }}>
              Siguiente: {series < ex.sets ? `Serie ${series + 1} de ${ex.sets}` : exIdx < exercises.length - 1 ? exercises[exIdx + 1].name : 'Fin del entrenamiento'}
            </div>
            <div className="rest-num">{timeLeft}</div>
            <div style={{ fontSize: 13, color: '#3B6D11', marginTop: 6 }}>segundos</div>
            <button
              style={{ marginTop: 20, background: 'none', border: '0.5px solid #3B6D11', color: '#085041', borderRadius: 'var(--r)', padding: '9px 20px', cursor: 'pointer', fontSize: 13 }}
              onClick={skipRest}
            >
              Saltar descanso ›
            </button>
          </div>
        </div>

        {/* Video del siguiente ejercicio durante el descanso */}
        {nextExercise && (
          <div>
            <div style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', marginBottom: 8 }}>
              Mira el siguiente ejercicio mientras descansas
            </div>
            <VideoSection youtubeUrl={ex.youtube_url} name={ex.name} />
          </div>
        )}
      </div>
    )
  }

  // ── PANTALLA DE EJERCICIO ─────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => { clearTimer(); onBack() }}>‹</button>
        <div>
          <div className="hdr-title">{ex.sec}</div>
          <div className="hdr-sub">Día {dayNumber}</div>
        </div>
      </div>

      {/* Barra progreso ejercicios */}
      <div className="prog-bars">
        {exercises.map((e, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < exIdx ? 'var(--gr)' : i === exIdx ? 'var(--pr)' : 'var(--bd)' }} />
        ))}
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--t1)', marginBottom: 4 }}>{ex.name}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>Serie {series} de {ex.sets}</div>

        {/* Barra progreso series */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20, width: '100%' }}>
          {Array.from({ length: ex.sets }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < series - 1 ? 'var(--gr)' : i === series - 1 ? 'var(--pr)' : 'var(--bd)' }} />
          ))}
        </div>

        {/* Timer */}
        <div style={{ fontSize: 72, fontWeight: 500, color: 'var(--t1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
          {ex.type === 'time' ? fmt(timeLeft) : ex.val}
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>
          {ex.type === 'time' ? 'segundos' : 'repeticiones'}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 24 }}>
          {[
            ['series', `${series}/${ex.sets}`],
            ['por serie', ex.type === 'time' ? `${ex.val}s` : `${ex.val} reps`],
            ['descanso', ex.rest > 0 ? `${ex.rest}s` : '—']
          ].map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--t1)' }}>{v}</div>
              <div style={{ fontSize: 11, color: 'var(--t2)' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <button onClick={prevSeries} style={{ width: 46, height: 46, borderRadius: '50%', border: '0.5px solid var(--bd)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}>⏮</button>
          <button onClick={togglePlay} style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--pr)', border: 'none', cursor: 'pointer', fontSize: 22, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ex.type === 'reps' ? '✓' : running ? '⏸' : '▶'}
          </button>
          <button onClick={nextSeries} style={{ width: 46, height: 46, borderRadius: '50%', border: '0.5px solid var(--bd)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}>⏭</button>
        </div>

        {isLast && (
          <button className="btn btn-primary" style={{ marginBottom: 16, width: '100%' }} onClick={finishWorkout}>
            Finalizar entrenamiento ✓
          </button>
        )}
      </div>

      {/* Video del ejercicio actual */}
      <VideoSection youtubeUrl={ex.youtube_url} name={ex.name} />
    </div>
  )
}