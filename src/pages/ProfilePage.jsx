import { useAuth } from '../hooks/useAuth'
import { usePlans } from '../hooks/usePlans'

export default function ProfilePage({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { plans, activePlan } = usePlans()
  const name = user?.user_metadata?.full_name || user?.email || 'Usuario'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div>
      <div className="hdr">
        <div className="hdr-logo">{initials}</div>
        <div><div className="hdr-title">Mi perfil</div><div className="hdr-sub">{user?.email}</div></div>
      </div>

      {/* Avatar + name */}
      <div style={{ padding: '24px 16px 16px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--pr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontSize: 24, fontWeight: 500 }}>{initials}</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--t1)' }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2 }}>{user?.email}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px', marginBottom: 20 }}>
        {[['Planes guardados', plans.length], ['Plan activo', activePlan?.name || 'Ninguno']].map(([l, v]) => (
          <div key={l} style={{ background: 'var(--surface2)', borderRadius: 'var(--rm)', padding: '14px 12px' }}>
            <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--t1)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Active plan info */}
      {activePlan && (
        <div className="sec">
          <div className="sec-lbl">Plan activo</div>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 28 }}>{activePlan.emoji}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)' }}>{activePlan.name}</div>
                <div style={{ fontSize: 13, color: 'var(--t2)' }}>{activePlan.total_days} días · {activePlan.level}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sec" style={{ marginTop: 16 }}>
        <div className="card" onClick={() => onNavigate('plans')}>
          <div className="card-row"><span style={{ flex: 1, fontSize: 14, color: 'var(--t1)' }}>Mis planes</span><span style={{ color: 'var(--t2)' }}>›</span></div>
        </div>
        <button className="btn btn-secondary" onClick={signOut} style={{ marginTop: 12, color: 'var(--pr-d)' }}>Cerrar sesión</button>
      </div>
    </div>
  )
}
