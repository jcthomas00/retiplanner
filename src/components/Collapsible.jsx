import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

export default function Collapsible({ title, actions, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.4rem 0' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none',
          cursor: 'pointer', padding: 0, marginBottom: '0.75rem',
        }}>
          <span className="card-title">{title}</span>
          <FontAwesomeIcon icon={faChevronDown} style={{
            fontSize: 10, color: 'var(--text-faint)',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.18s ease',
          }} />
        </button>
        {actions && <div style={{ marginBottom: '0.75rem' }}>{actions}</div>}
      </div>
      <div style={{
        maxHeight: open ? 4000 : 0, overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.25s ease',
        opacity: open ? 1 : 0,
      }}>
        <div style={{ padding: '0 1.4rem 1.4rem' }}>{children}</div>
      </div>
    </div>
  )
}
