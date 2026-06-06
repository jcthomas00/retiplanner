import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password)
        if (error) setError(error.message)
      } else {
        const { error } = await signUp(email, password)
        if (error) setError(error.message)
        else setMessage('Check your email to confirm your account.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-page)', padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: 22
          }}>📈</div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text)' }}>
            Retirement Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Track your assets & plan your retirement
          </p>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '1.75rem'
        }}>
          <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'var(--bg-page)', borderRadius: 8, padding: 3 }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '7px', borderRadius: 6, border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: mode === m ? 'var(--card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s'
              }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="you@example.com"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6, color: 'var(--text)' }}>
                Password
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                required placeholder="••••••••" minLength={6}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#FCEBEB', color: '#A32D2D', padding: '10px 12px',
                borderRadius: 8, fontSize: 13, marginBottom: 12
              }}>{error}</div>
            )}
            {message && (
              <div style={{
                background: '#EAF3DE', color: '#3B6D11', padding: '10px 12px',
                borderRadius: 8, fontSize: 13, marginBottom: 12
              }}>{message}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '11px', borderRadius: 8,
              background: 'var(--accent)', color: '#fff', border: 'none',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
