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
        .dash-header {
          padding: 0 1.5rem; height: 60px;
          position: sticky; top: 0; z-index: 40;
          backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        }
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
        .dash-tab {
          padding: 7px 18px; border-radius: 999px; border: none; cursor: pointer;
          font-size: 13px; font-family: var(--font);
          transition: all 0.15s ease;
        }
        .dash-tab:hover:not(.active) { color: var(--text); }
      `}</style>
      <div className="dash-header" style={{
        borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--card) 82%, transparent)',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em', color: 'var(--text)', marginRight: 'auto' }}>
          <Logo size={27} /> RetiPlanner
        </span>

        <nav className="dash-nav-desktop" style={{
          gap: 2, padding: 3, borderRadius: 999,
          background: 'var(--card-alt)', border: '1px solid var(--border)',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`dash-tab${activeTab === t.id ? ' active' : ''}`}
              style={{
                fontWeight: activeTab === t.id ? 600 : 500,
                background: activeTab === t.id ? 'var(--card)' : 'transparent',
                color: activeTab === t.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: activeTab === t.id ? 'var(--shadow-card)' : 'none',
              }}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="dash-header-controls" style={{ marginLeft: 'auto', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 999, background: 'var(--card-alt)', border: '1px solid var(--border)' }}>
            {THEME_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setTheme(opt.id)} title={opt.label} style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11,
                background: theme === opt.id ? 'var(--card)' : 'transparent',
                color: theme === opt.id ? 'var(--text)' : 'var(--text-faint)',
                boxShadow: theme === opt.id ? 'var(--shadow-card)' : 'none',
                transition: 'all 0.15s ease',
              }}>
                <FontAwesomeIcon icon={opt.icon} />
              </button>
            ))}
          </div>
          <span className="dash-user-email" style={{ fontSize: 12, color: 'var(--text-faint)' }}>{user?.email}</span>
          <button onClick={signOut} className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px', fontWeight: 500, color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faRightFromBracket} /> <span className="dash-user-email">Sign out</span>
          </button>

          <button className="dash-hamburger" onClick={() => setMobileNavOpen(o => !o)} aria-label="Menu" style={{
            width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
            borderRadius: 999, border: '1px solid var(--border-strong)', background: 'transparent',
            color: 'var(--text)', cursor: 'pointer', fontSize: 14
          }}>
            <FontAwesomeIcon icon={mobileNavOpen ? faXmark : faBars} />
          </button>
        </div>

        {/* Mobile dropdown nav */}
        <div className={`dash-mobile-panel${mobileNavOpen ? ' open' : ''}`} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          flexDirection: 'column', padding: '0.6rem', boxShadow: 'var(--shadow-pop)',
          borderRadius: '0 0 18px 18px',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setMobileNavOpen(false) }} style={{
              textAlign: 'left', padding: '12px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: 14, fontFamily: 'var(--font)', fontWeight: activeTab === t.id ? 600 : 500,
              background: activeTab === t.id ? 'var(--accent-light)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              marginBottom: 2,
            }}>
              {t.label}
            </button>
          ))}
          <div style={{ padding: '10px 16px 6px', fontSize: 12, color: 'var(--text-faint)', borderTop: '1px solid var(--border)', marginTop: 4 }}>
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
              margin: '0 auto', padding: '1.75rem 1.5rem 3rem',
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
                updateAsset={dash.updateAsset}
                deleteAsset={dash.deleteAsset}
                assetHistory={dash.assetHistory}
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
