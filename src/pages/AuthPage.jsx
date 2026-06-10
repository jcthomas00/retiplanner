import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  )
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogle = async () => {
    setError(''); setMessage(''); setGoogleLoading(true)
    try {
      const { error } = await signInWithGoogle()
      if (error) { setError(error.message); setGoogleLoading(false) }
      // on success, browser redirects to provider — no need to reset loading
    } catch (e) {
      setError(e.message); setGoogleLoading(false)
    }
  }

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
            width: 52, height: 52, borderRadius: 16,
            background: 'var(--accent)', display: 'flex', color: '#fff',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: 22,
            boxShadow: '0 8px 24px var(--accent-light)',
          }}><FontAwesomeIcon icon={faChartLine} /></div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', margin: 0, color: 'var(--text)' }}>
            Retirement Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Track your assets & plan your retirement
          </p>
        </div>

        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', marginBottom: '1.5rem', background: 'var(--card-alt)', borderRadius: 999, padding: 3 }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '8px', borderRadius: 999, border: 'none',
                fontSize: 13, fontWeight: mode === m ? 600 : 500, cursor: 'pointer',
                background: mode === m ? 'var(--card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: mode === m ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s'
              }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <button type="button" onClick={handleGoogle} disabled={googleLoading} style={{
            width: '100%', padding: '10px', borderRadius: 8, marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)',
            fontSize: 14, fontWeight: 500, cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.7 : 1, transition: 'background 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-alt)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--card)' }}
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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

            <button type="submit" disabled={loading} className="btn btn-primary" style={{
              width: '100%', padding: '12px', fontSize: 14,
            }}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
