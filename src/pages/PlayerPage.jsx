import { useState, useEffect, useRef } from 'react'
import { useProgress } from '../hooks/useProgress'
import ExerciseGif from '../components/ExerciseGif'
import { parseReps } from '../lib/parseReps'

const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null

function playSound(type) {
  if (!audioCtx) return
  if (audioCtx.state === 'suspended') audioCtx.resume()

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)

  if (type === 'exercise') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1)
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.4)
  } else if (type === 'rest') {
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(523, audioCtx.currentTime)
    osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15)
    osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.3)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.5)
  } else if (type === 'finish') {
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523, audioCtx.currentTime)
    osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.15)
    osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.3)
    osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.45)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.7)
  }
}

const VideoSection = ({ youtubeUrl, name }) => {
  const ytId = youtubeUrl?.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/\s]+)/)?.[1] || null

  if (!youtubeUrl && !name) return null

  if (ytId) {
    return (
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
  }

  if (youtubeUrl && !ytId) {
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

  return <ExerciseGif exerciseName={name} size="large" />
}

export default function PlayerPage({ exercises = [], startIndex = 0, planId, dayNumber, onBack, onComplete }) {
  const { logSeries, completeDay } = useProgress(planId)
  const [exIdx, setExIdx] = useState(startIndex)
  const [series, setSeries] = useState(1)
  const [phase, setPhase] = useState('exercise')
  const [timeLeft, setTimeLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [exerciseDone, setExerciseDone] = useState(false)
  const [activeVideoIdx, setActiveVideoIdx] = useState(0)
  const timerRef = useRef(null)

  const ex = exercises[exIdx]
  const isSuperset = Array.isArray(ex?.exercises) && ex.exercises.length > 0
  const repInfo = ex ? parseReps(ex.reps) : { type: 'reps', val: 12 }

  const totalExercises = exercises.length
  const isLast = exIdx === totalExercises - 1 && series === (ex?.sets || 1)

  useEffect(() => {
    if (ex) {
      const info = parseReps(ex.reps)
      setTimeLeft(info.type === 'time' ? info.val : 0)
      setRunning(false)
      setExerciseDone(false)
      setActiveVideoIdx(0)
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
    if (repInfo.type === 'reps') { seriesDone(); return }
    if (running) { clearTimer(); setRunning(false) }
    else startTimer(timeLeft, () => setExerciseDone(true))
  }

  const seriesDone = async () => {
    clearTimer(); setRunning(false)
    playSound('exercise')
    const exerciseNames = isSuperset ? ex.exercises.map(e => e.name) : [ex.name]
    for (const name of exerciseNames) {
      await logSeries(dayNumber, name, series)
    }

    if (ex.rest_seconds > 0 && series < (ex.sets || 1)) {
      setPhase('rest')
      setTimeLeft(ex.rest_seconds)
      startTimer(ex.rest_seconds, afterRest)
    } else {
      afterRest()
    }
  }

  const afterRest = () => {
    playSound('rest')
    setPhase('exercise')
    setExerciseDone(false)
    setActiveVideoIdx(0)

    if (series < (ex.sets || 1)) {
      setSeries(s => s + 1)
    } else if (exIdx < totalExercises - 1) {
      setExIdx(i => i + 1)
      setSeries(1)
    } else {
      finishWorkout()
    }
  }

  const skipRest = () => { clearTimer(); setRunning(false); afterRest() }

  const startRest = () => {
    setExerciseDone(false)
    const restSec = ex.rest_seconds || 45
    if (restSec > 0) {
      setPhase('rest')
      setTimeLeft(restSec)
      startTimer(restSec, afterRest)
    } else {
      afterRest()
    }
  }

  const finishWorkout = async () => {
    playSound('finish')
    const allNames = exercises.flatMap(e => e.type === 'superset' ? e.exercises.map(x => x.name) : e.name)
    await completeDay(dayNumber, allNames)
    onComplete && onComplete()
    onBack()
  }

  const nextSeries = async () => {
    clearTimer(); setRunning(false); setPhase('exercise'); setExerciseDone(false)
    const exerciseNames = isSuperset ? ex.exercises.map(e => e.name) : [ex.name]
    for (const name of exerciseNames) {
      await logSeries(dayNumber, name, series)
    }
    seriesDone()
  }

  const prevSeries = () => {
    clearTimer(); setRunning(false); setPhase('exercise'); setExerciseDone(false)
    if (series > 1) setSeries(s => s - 1)
    else if (exIdx > 0) { setExIdx(i => i - 1); setSeries(exercises[exIdx - 1]?.sets || 1) }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  if (!ex) return null

  const displaySets = ex.sets || 1
  const displayRest = ex.rest_seconds || 45

  // ── PANTALLA DE DESCANSO ──────────────────────────────────────
  if (phase === 'rest') {
    return (
      <div>
        <div className="hdr">
          <button className="btn-ghost" onClick={skipRest}>‹</button>
          <div>
            <div className="hdr-title">Descanso</div>
            <div className="hdr-sub">{isSuperset ? 'Superserie' : ex.name} · serie {series} completada</div>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div className="rest-card">
            <div style={{ fontSize: 18, fontWeight: 500, color: '#085041', marginBottom: 4 }}>Descansa</div>
            <div style={{ fontSize: 13, color: '#3B6D11', marginBottom: 20 }}>
              Siguiente: {exIdx < totalExercises - 1 ? (exercises[exIdx + 1].type === 'superset' ? '🔗 Superserie' : exercises[exIdx + 1].name) : 'Fin del entrenamiento'}
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
      </div>
    )
  }

  // ── PANTALLA: EJERCICIO COMPLETADO (esperando iniciar descanso) ──────────
  if (exerciseDone) {
    return (
      <div>
        <div className="hdr">
          <button className="btn-ghost" onClick={() => { setExerciseDone(false); setPhase('exercise') }}>‹</button>
          <div>
            <div className="hdr-title">✅ Completado</div>
            <div className="hdr-sub">{isSuperset ? 'Superserie' : ex.name}</div>
          </div>
        </div>

        <div style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--t1)', marginBottom: 8 }}>
            {repInfo.type === 'time' ? 'Tiempo completado' : 'Serie completada'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24 }}>
            Serie {series} de {displaySets}
          </div>

          <button className="btn btn-primary" onClick={startRest} style={{ marginBottom: 12 }}>
            Iniciar descanso ({displayRest}s) ›
          </button>
          <button className="btn btn-secondary" onClick={() => { setExerciseDone(false); setPhase('exercise') }}>
            Volver al ejercicio
          </button>
        </div>
      </div>
    )
  }

  // ── PANTALLA DE EJERCICIO ─────────────────────────────────────
  return (
    <div style={{ paddingBottom: 24 }}>
      <div className="hdr">
        <button className="btn-ghost" onClick={() => { clearTimer(); onBack() }}>‹</button>
        <div>
          <div className="hdr-title">{ex.sec || 'Ejercicio'}</div>
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

        {/* Nota */}
        {ex.note && (
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--rm)', padding: '6px 12px', marginBottom: 12, fontSize: 12, color: 'var(--t2)' }}>
            📝 {ex.note}
          </div>
        )}

        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 20 }}>Serie {series} de {displaySets}</div>

        {/* Barra progreso series */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 20, width: '100%' }}>
          {Array.from({ length: displaySets }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < series - 1 ? 'var(--gr)' : i === series - 1 ? 'var(--pr)' : 'var(--bd)' }} />
          ))}
        </div>

        {/* Timer */}
        <div style={{ fontSize: 72, fontWeight: 500, color: 'var(--t1)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', marginBottom: 8 }}>
          {repInfo.type === 'time' ? fmt(timeLeft) : repInfo.val}
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 24 }}>
          {repInfo.type === 'time' ? 'segundos' : 'repeticiones'}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 28, marginBottom: 24 }}>
          {[
            ['series', `${series}/${displaySets}`],
            ['por serie', repInfo.type === 'time' ? `${repInfo.val}s` : `${repInfo.val} reps`],
            ['descanso', displayRest > 0 ? `${displayRest}s` : '—']
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
            {repInfo.type === 'reps' ? '✓' : running ? '⏸' : '▶'}
          </button>
          <button onClick={nextSeries} style={{ width: 46, height: 46, borderRadius: '50%', border: '0.5px solid var(--bd)', background: 'var(--surface)', cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t2)' }}>⏭</button>
        </div>

        {isLast && (
          <button className="btn btn-primary" style={{ marginBottom: 16, width: '100%' }} onClick={finishWorkout}>
            Finalizar entrenamiento ✓
          </button>
        )}
      </div>

      {/* Video del ejercicio seleccionado */}
      {isSuperset && ex.exercises && ex.exercises.length > 0 ? (
        <div style={{ margin: '0 16px 16px' }}>
          <VideoSection
            youtubeUrl={ex.exercises[activeVideoIdx]?.youtube_url}
            name={ex.exercises[activeVideoIdx]?.name}
          />

          {/* Lista de ejercicios clickeable */}
          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6 }}>Ejercicios de la superserie:</div>
            {ex.exercises.map((subEx, i) => (
              <div
                key={i}
                onClick={() => setActiveVideoIdx(i)}
                style={{
                  padding: '8px 4px',
                  fontSize: 14,
                  color: i === activeVideoIdx ? 'var(--pr)' : 'var(--t1)',
                  cursor: 'pointer',
                  fontWeight: i === activeVideoIdx ? 500 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--t3)', width: 16 }}>{i + 1}.</span>
                <span>{subEx.name}</span>
                {i === activeVideoIdx && <span style={{ fontSize: 11 }}>👆</span>}
              </div>
            ))}
          </div>
        </div>
      ) : isSuperset ? (
        <div style={{ margin: '0 16px 16px', padding: 12, background: 'var(--surface2)', borderRadius: 'var(--r)', textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>
          Sin ejercicios configurados en esta superserie
        </div>
      ) : (
        <VideoSection youtubeUrl={ex.youtube_url} name={ex.name} />
      )}
    </div>
  )
}
