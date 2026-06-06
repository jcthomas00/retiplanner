import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDashboard } from '../hooks/useDashboard'
import Overview from '../components/Overview'
import Assets from '../components/Assets'
import IncomeSources from '../components/IncomeSources'
import Projection from '../components/Projection'
import Simulation from '../components/Simulation'
import PDFImport from '../components/PDFImport'
import Chat from '../components/Chat'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'assets', label: 'Assets' },
  { id: 'projection', label: 'Projection' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'import', label: 'Import' },
]

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [chatOpen, setChatOpen] = useState(false)
  const dash = useDashboard()

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
      <div style={{
        borderBottom: '1px solid var(--border)', background: 'var(--card)',
        padding: '0 1.5rem', display: 'flex', alignItems: 'center', height: 56
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text)', marginRight: 'auto' }}>
          📈 Retirement
        </span>

        <nav style={{ display: 'flex', gap: 2 }}>
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

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user?.email}</span>
          <button onClick={signOut} style={{
            fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
          }}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1.5rem' }}>
        {activeTab === 'overview' && (
          <Overview
            assets={dash.assets}
            contributions={dash.contributions}
            params={dash.params}
            totalBalance={dash.totalBalance}
            investableBalance={dash.investableBalance}
            totalContrib={dash.totalContrib}
          />
        )}
        {activeTab === 'assets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Assets
              assets={dash.assets}
              contributions={dash.contributions}
              totalBalance={dash.totalBalance}
              addAsset={dash.addAsset}
              deleteAsset={dash.deleteAsset}
              addContribution={dash.addContribution}
              deleteContribution={dash.deleteContribution}
              retAge={dash.params.retAge}
            />
            <IncomeSources
              incomeSources={dash.incomeSources}
              addIncomeSource={dash.addIncomeSource}
              updateIncomeSource={dash.updateIncomeSource}
              deleteIncomeSource={dash.deleteIncomeSource}
              retAge={dash.params.retAge}
            />
          </div>
        )}
        {activeTab === 'projection' && (
          <Projection
            params={dash.params}
            onChange={dash.saveParams}
            assets={dash.assets}
            totalContrib={dash.totalContrib}
            incomeSources={dash.incomeSources}
            updateIncomeSource={dash.updateIncomeSource}
          />
        )}
        {activeTab === 'simulation' && (
          <Simulation
            params={dash.params}
            onChange={dash.saveParams}
            assets={dash.assets}
            totalContrib={dash.totalContrib}
            incomeSources={dash.incomeSources}
          />
        )}
        {activeTab === 'import' && (
          <PDFImport
            addAsset={dash.addAsset}
            addContribution={dash.addContribution}
            addIncomeSource={dash.addIncomeSource}
            saveParams={dash.saveParams}
            existingParams={dash.params}
          />
        )}
      </div>

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
