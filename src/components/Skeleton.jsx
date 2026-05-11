export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--bd)', borderRadius: 'var(--r)', padding: 16, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface2)', animation: 'pulse 1.5s infinite' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 16, background: 'var(--surface2)', borderRadius: 4, animation: 'pulse 1.5s infinite', marginBottom: 8 }} />
          <div style={{ height: 12, background: 'var(--surface2)', borderRadius: 4, animation: 'pulse 1.5s infinite', width: '70%' }} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 2 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            background: 'var(--surface2)',
            borderRadius: 4,
            animation: 'pulse 1.5s infinite',
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 60,
            background: 'var(--surface2)',
            borderRadius: 'var(--rm)',
            animation: 'pulse 1.5s infinite',
          }}
        />
      ))}
    </div>
  )
}
