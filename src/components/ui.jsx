export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', style = {}, type = 'button', ...props }) {
  const baseClass = `btn btn-${variant}`
  const sizeClass = size === 'sm' ? 'btn-sm' : ''
  const fullClass = `${baseClass} ${sizeClass} ${className}`.trim()

  return (
    <button
      type={type}
      className={fullClass}
      onClick={onClick}
      disabled={disabled}
      style={style}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, onClick, className = '', style = {} }) {
  return (
    <div
      className={`card ${className}`.trim()}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
    >
      {children}
    </div>
  )
}

export function Input({ label, error, className = '', style = {}, ...props }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      {label && <label className="form-label">{label}</label>}
      <input className={`input ${className}`.trim()} style={style} {...props} />
      {error && <div style={{ fontSize: 12, color: 'var(--pr-d)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

export function TextArea({ label, error, className = '', style = {}, ...props }) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      {label && <label className="form-label">{label}</label>}
      <textarea className={`input ${className}`.trim()} style={{ minHeight: 80, resize: 'none', ...style }} {...props} />
      {error && <div style={{ fontSize: 12, color: 'var(--pr-d)', marginTop: 4 }}>{error}</div>}
    </div>
  )
}

export function Modal({ children, onClose, title }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--r) var(--r) 0 0', padding: 20, width: '100%', maxWidth: 430 }}>
        {title && <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--t1)', marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  )
}

export function Toggle({ options, value, onChange }) {
  return (
    <div className="tog">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`toggle-btn ${value === opt.value ? 'on' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({ label, active, onClick }) {
  return (
    <button className={`chip ${active ? 'on' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

export function Tag({ label, variant = 'default' }) {
  const variantClass = variant === 'primary' ? 'tag-primary' : variant === 'success' ? 'tag-green' : ''
  return <span className={`tag ${variantClass}`}>{label}</span>
}
