import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

export default function Collapsible({ title, actions, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.25rem 0' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none',
          cursor: 'pointer', padding: 0, marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
          <FontAwesomeIcon icon={faChevronDown} style={{
            fontSize: 10, color: 'var(--text-muted)',
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
        <div style={{ padding: '0 1.25rem 1.25rem' }}>{children}</div>
      </div>
    </div>
  )
}
