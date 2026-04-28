import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { usePlans } from './hooks/usePlans'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import PlansPage from './pages/PlansPage'
import PlayerPage from './pages/PlayerPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const { user, loading } = useAuth()
  const { activePlan, setActivePlan } = usePlans()
  const [page, setPage] = useState('home')
  const [playerParams, setPlayerParams] = useState(null)
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('theme') === 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])



  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="dots"><div className="dot" /><div className="dot" /><div className="dot" /></div>
    </div>
  )

  if (!user) return <AuthPage />

  const navigate = (to, params = null) => {
    if (to === 'player' && params) setPlayerParams(params)
    setPage(to)
    window.scrollTo(0, 0)
  }

  

  return (
    <div className="app-shell">
      {page === 'home' && (
        <HomePage 
          activePlan={activePlan} 
          onNavigate={navigate}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(d => !d)} 
        />
      )}
      {page === 'plans' && <PlansPage onNavigate={navigate} onPlanSelected={(plan) => setActivePlan(plan.id)} />}
      {page === 'player' && playerParams && (
        <PlayerPage
          {...playerParams}
          onBack={() => setPage('home')}
          onComplete={() => setPage('home')}
        />
      )}
      {page === 'profile' && <ProfilePage onNavigate={navigate} />}

      {/* Bottom Nav */}
      {page !== 'player' && (
        <div className="bottom-nav">
          {[
            { id: 'home', icon: '🏠', label: 'Inicio' },
            { id: 'plans', icon: '📋', label: 'Planes' },
            { id: 'profile', icon: '👤', label: 'Perfil' },
          ].map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'on' : ''}`} onClick={() => navigate(item.id)}>
              <span className="nav-icon" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
