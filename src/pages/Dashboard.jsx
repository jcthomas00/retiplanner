import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faDesktop, faRightFromBracket, faBars, faXmark } from '@fortawesome/free-solid-svg-icons'
import Logo from '../components/Logo'
import { useTheme } from '../hooks/useTheme'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import Overview from '../components/Overview'
import Projection from '../components/Projection'
import Simulation from '../components/Simulation'
import Chat from '../components/Chat'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'projection', label: 'Projection' },
  { id: 'simulation', label: 'Simulation' },
]

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [chatOpen, setChatOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [theme, setTheme] = useTheme()
  const dash = useDashboard()

  const THEME_OPTIONS = [
    { id: 'light', icon: faSun, label: 'Light' },
    { id: 'system', icon: faDesktop, label: 'System' },
    { id: 'dark', icon: faMoon, label: 'Dark' },
  ]

  if (dash.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading your dashboard…</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Header */}
      <style>{`
        .dash-content { max-width: 960px; }
        @media (min-width: 1600px) {
          .dash-content.wide { max-width: 1500px; }
        }
        .dash-header { padding: 0 1.5rem; height: 56px; }
        .dash-nav-desktop { display: flex; }
        .dash-hamburger { display: none; }
        .dash-mobile-panel { display: none; }
        .dash-header-controls { display: flex; }
        .dash-user-email { display: inline; }
        @media (max-width: 720px) {
          .dash-header { padding: 0 1rem; }
          .dash-nav-desktop { display: none; }
          .dash-hamburger { display: flex; }
          .dash-user-email { display: none; }
          .dash-header-controls { gap: 6px; }
          .dash-mobile-panel.open { display: flex; }
        }
      `}</style>
      <div className="dash-header" style={{
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
        display: 'flex', alignItems: 'center', position: 'relative'
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)', marginRight: 'auto' }}>
          <Logo size={26} /> RetiPlanner
        </span>

        <nav className="dash-nav-desktop" style={{ gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === t.id ? 600 : 400,
              background: activeTab === t.id ? 'var(--card-alt)' : 'transparent',
              color: activeTab === t.id ? 'var(--text)' : 'var(--text-muted)',
              transition: 'all 0.12s'
            }}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="dash-header-controls" style={{ marginLeft: 'auto', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 2, borderRadius: 8, background: 'var(--card-alt)', border: '1px solid var(--border)' }}>
            {THEME_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setTheme(opt.id)} title={opt.label} style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                background: theme === opt.id ? 'var(--card)' : 'transparent',
                color: theme === opt.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: theme === opt.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <FontAwesomeIcon icon={opt.icon} />
              </button>
            ))}
          </div>
          <span className="dash-user-email" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</span>
          <button onClick={signOut} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
          }}><FontAwesomeIcon icon={faRightFromBracket} /> <span className="dash-user-email">Sign out</span></button>

          <button className="dash-hamburger" onClick={() => setMobileNavOpen(o => !o)} aria-label="Menu" style={{
            width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text)', cursor: 'pointer', fontSize: 14
          }}>
            <FontAwesomeIcon icon={mobileNavOpen ? faXmark : faBars} />
          </button>
        </div>

        {/* Mobile dropdown nav */}
        <div className={`dash-mobile-panel${mobileNavOpen ? ' open' : ''}`} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          flexDirection: 'column', padding: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setMobileNavOpen(false) }} style={{
              textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: activeTab === t.id ? 600 : 400,
              background: activeTab === t.id ? 'var(--card-alt)' : 'transparent',
              color: activeTab === t.id ? 'var(--text)' : 'var(--text-muted)',
              marginBottom: 2,
            }}>
              {t.label}
            </button>
          ))}
          <div style={{ padding: '8px 14px 4px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', marginTop: 4 }}>
            {user?.email}
          </div>
        </div>
      </div>

      {TABS.map(t => {
        const isActive = activeTab === t.id
        const isWide = t.id === 'projection' || t.id === 'overview'
        return (
          <div
            key={t.id}
            className={`dash-content${isActive ? ' fade-in-up' : ''}${isWide ? ' wide' : ''}`}
            style={{
              margin: '0 auto', padding: '1.5rem 1.5rem',
              display: isActive ? 'block' : 'none',
            }}
          >
            {t.id === 'overview' && (
              <Overview
                assets={dash.assets}
                params={dash.params}
                totalBalance={dash.totalBalance}
                investableBalance={dash.investableBalance}
                totalContrib={dash.totalContrib}
                addAsset={dash.addAsset}
                deleteAsset={dash.deleteAsset}
                addContribution={dash.addContribution}
                incomeSources={dash.incomeSources}
                addIncomeSource={dash.addIncomeSource}
                updateIncomeSource={dash.updateIncomeSource}
                deleteIncomeSource={dash.deleteIncomeSource}
                saveParams={dash.saveParams}
              />
            )}
            {t.id === 'projection' && (
              <Projection
                params={dash.params}
                onChange={dash.saveParams}
                assets={dash.assets}
                totalContrib={dash.totalContrib}
                incomeSources={dash.incomeSources}
                updateIncomeSource={dash.updateIncomeSource}
                contributions={dash.contributions}
                addContribution={dash.addContribution}
                deleteContribution={dash.deleteContribution}
              />
            )}
            {t.id === 'simulation' && (
              <Simulation
                params={dash.params}
                onChange={dash.saveParams}
                assets={dash.assets}
                totalContrib={dash.totalContrib}
                incomeSources={dash.incomeSources}
              />
            )}
          </div>
        )
      })}

      {/* Floating chat */}
      <Chat
        assets={dash.assets}
        contributions={dash.contributions}
        incomeSources={dash.incomeSources}
        params={dash.params}
        open={chatOpen}
        onToggle={() => setChatOpen(o => !o)}
      />
    </div>
  )
}
