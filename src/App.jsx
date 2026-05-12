import { useState, useEffect, Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePlansV2 } from './hooks/usePlansV2'
import AuthPage from './pages/AuthPage'

const HomePage = lazy(() => import('./pages/HomePage'))
const PlansPageV2 = lazy(() => import('./pages/PlansPageV2'))
const PlanBuilderPage = lazy(() => import('./pages/PlanBuilderPage'))
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function PageLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="dots"><div className="dot" /><div className="dot" /><div className="dot" /></div>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()
  const { activePlan } = usePlansV2()
  const [page, setPage] = useState('home')
  const [pageParams, setPageParams] = useState(null)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  if (loading) return <PageLoader />
  if (!user) return <AuthPage />

  const navigate = (to, params = null) => {
    setPageParams(params)
    setPage(to)
    window.scrollTo(0, 0)
  }

  return (
    <div className="app-shell">
      <Suspense fallback={<PageLoader />}>
        {page === 'home' && <HomePage activePlan={activePlan} onNavigate={navigate} darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />}
        {page === 'plans' && <PlansPageV2 onNavigate={navigate} />}
        {page === 'plan-builder' && pageParams?.planId && <PlanBuilderPage planId={pageParams.planId} onNavigate={navigate} />}
        {page === 'exercises' && <ExercisesPage onNavigate={navigate} />}
        {page === 'player' && pageParams && <PlayerPage {...pageParams} onBack={() => setPage('home')} onComplete={() => setPage('home')} />}
        {page === 'profile' && <ProfilePage onNavigate={navigate} />}
      </Suspense>

      {page !== 'player' && (
        <div className="bottom-nav">
          {[
            { id: 'home', icon: '🏠', label: 'Inicio' },
            { id: 'exercises', icon: '💪', label: 'Ejercicios' },
            { id: 'plans', icon: '📋', label: 'Planes' },
            { id: 'profile', icon: '👤', label: 'Perfil' },
          ].map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'on' : ''}`} onClick={() => navigate(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
