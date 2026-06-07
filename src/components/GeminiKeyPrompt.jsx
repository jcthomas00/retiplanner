import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKey, faXmark, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons'

export default function GeminiKeyPrompt({ onSave, onDismiss, context = 'feature' }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  function handleSave(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setError('Please enter a key.'); return }
    if (!trimmed.startsWith('AI') && trimmed.length < 20) {
      setError('That doesn\'t look like a valid Gemini key.')
      return
    }
    onSave(trimmed)
  }

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '1.5rem', maxWidth: 440,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, background: 'var(--card-alt)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 13, flexShrink: 0,
          }}>
            <FontAwesomeIcon icon={faKey} />
          </span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Gemini API key required</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
              Needed to use {context}
            </div>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 15, padding: '0 2px',
          }}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.6 }}>
        Your key is stored only in this browser — it's never sent to any server other than Google.{' '}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          Get a free key <FontAwesomeIcon icon={faArrowUpRightFromSquare} style={{ fontSize: 10 }} />
        </a>
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          placeholder="AIza..."
          style={{
            width: '100%', padding: '9px 11px', borderRadius: 8, boxSizing: 'border-box',
            border: `1px solid ${error ? '#A32D2D' : 'var(--border)'}`,
            background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, outline: 'none',
            fontFamily: 'monospace',
          }}
        />
        {error && <div style={{ fontSize: 12, color: '#A32D2D' }}>{error}</div>}
        <button type="submit" style={{
          padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          Save key &amp; continue
        </button>
      </form>
    </div>
  )
}
