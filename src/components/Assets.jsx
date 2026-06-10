import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip
} from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan, faChevronDown, faChevronUp, faPen, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { fmt, fmtK, ASSET_COLORS, ASSET_TYPES } from '../lib/finance'
import { verticalGradient, crosshairGlow, glassTooltip, axisStyle } from '../lib/chartTheme'
import Collapsible from './Collapsible'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

function AssetForm({ onSave, onCancel, retAge }) {
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [type, setType] = useState('retirement')
  const [color, setColor] = useState(ASSET_COLORS[0])
  const [withdrawalAge, setWithdrawalAge] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !balance) return
    onSave({ name, balance: parseFloat(balance), type, color, withdrawal_age: withdrawalAge ? parseInt(withdrawalAge) : null })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, padding: 16, background: 'var(--card-alt)', borderRadius: 'var(--radius-inner)' }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Name</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vanguard 401(k)" required />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Balance ($)</label>
        <input className="input" type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" required min="0" />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Type</label>
        <select className="input" value={type} onChange={e => setType(e.target.value)}>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Color</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {ASSET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
              cursor: 'pointer', outline: color === c ? '2px solid var(--text)' : 'none',
              outlineOffset: 2
            }} />
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>
          Withdrawal age <span style={{ fontWeight: 400 }}>(optional — leave blank to use retirement age)</span>
        </label>
        <input className="input" type="number" value={withdrawalAge} onChange={e => setWithdrawalAge(e.target.value)}
          placeholder={retAge ? `${retAge} (retirement age)` : 'e.g. 72'}
          min="50" max="90" />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>Add asset</button>
      </div>
    </form>
  )
}

function BalanceTrendChart({ history, color }) {
  if (!history || history.length < 2) {
    return (
      <div style={{ padding: '18px 0 6px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 12 }}>
        No history yet — update the balance to start tracking trends.
      </div>
    )
  }

  const labels = history.map(h => {
    const d = new Date(h.recorded_at)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
  })
  const data = history.map(h => Number(h.balance))
  const chartData = {
    labels,
    datasets: [{
      data,
      borderColor: color || '#1D9E75',
      borderWidth: 2,
      pointRadius: data.length <= 12 ? 3 : 0,
      pointHitRadius: 16,
      fill: true,
      backgroundColor: verticalGradient(color || '#1D9E75', 0.25),
      tension: 0.35,
    }]
  }

  return (
    <div className="chart-glass" style={{ height: 160, marginTop: 12 }}>
      <Line data={chartData} plugins={[crosshairGlow]} options={{
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: false, external: glassTooltip,
            callbacks: { label: c => fmtK(c.raw) },
          },
        },
        scales: axisStyle(v => fmtK(v)),
      }} />
    </div>
  )
}

function EditBalanceForm({ asset, onSave, onCancel }) {
  const [balance, setBalance] = useState(String(asset.balance))
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(parseFloat(balance)) }}
      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        className="input"
        type="number"
        value={balance}
        onChange={e => setBalance(e.target.value)}
        style={{ width: 120, padding: '5px 10px', fontSize: 13 }}
        autoFocus
        min="0"
        required
      />
      <button type="submit" className="icon-btn" aria-label="Save" style={{ color: 'var(--accent)' }}>
        <FontAwesomeIcon icon={faCheck} />
      </button>
      <button type="button" onClick={onCancel} className="icon-btn" aria-label="Cancel">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </form>
  )
}

export default function Assets({ assets, totalBalance, addAsset, updateAsset, deleteAsset, assetHistory, retAge }) {
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [editingBalanceId, setEditingBalanceId] = useState(null)

  const typeLabel = (t) => ASSET_TYPES.find(x => x.value === t)?.label || t

  const handleSaveBalance = async (asset, newBalance) => {
    await updateAsset(asset.id, { balance: newBalance })
    setEditingBalanceId(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Collapsible title="Assets" actions={
        <button onClick={() => setShowAssetForm(v => !v)} className="btn btn-subtle" style={{ fontSize: 12, padding: '6px 13px' }}>+ Add asset</button>
      }>
        {assets.map(a => {
          const isExpanded = expandedId === a.id
          const hist = assetHistory?.[a.id] || []
          return (
            <div key={a.id}>
              <div
                className="list-row"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.name}</span>
                <span className="chip">{typeLabel(a.type)}</span>
                {a.withdrawal_age && a.withdrawal_age !== retAge && (
                  <span className="chip" style={{ color: 'var(--warning)' }}>
                    withdraw at {a.withdrawal_age}
                  </span>
                )}
                {editingBalanceId === a.id ? (
                  <span onClick={e => e.stopPropagation()}>
                    <EditBalanceForm
                      asset={a}
                      onSave={b => handleSaveBalance(a, b)}
                      onCancel={() => setEditingBalanceId(null)}
                    />
                  </span>
                ) : (
                  <span
                    style={{ fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums', cursor: 'text' }}
                    onClick={e => { e.stopPropagation(); setEditingBalanceId(a.id); setExpandedId(a.id) }}
                    title="Click to update balance"
                  >
                    {fmt(a.balance)}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-faint)', minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {totalBalance > 0 ? Math.round(Number(a.balance) / totalBalance * 100) : 0}%
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setEditingBalanceId(a.id === editingBalanceId ? null : a.id); setExpandedId(a.id) }}
                  className="icon-btn"
                  aria-label="Edit balance"
                  title="Update balance"
                  style={{ fontSize: 11 }}
                >
                  <FontAwesomeIcon icon={faPen} />
                </button>
                <button onClick={e => { e.stopPropagation(); deleteAsset(a.id) }} className="icon-btn danger" aria-label="Delete">
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
                <span style={{ color: 'var(--text-faint)', fontSize: 11, marginLeft: -4 }}>
                  <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown} />
                </span>
              </div>

              {isExpanded && (
                <div style={{ padding: '4px 6px 10px', animation: 'fadeInUp 0.18s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Balance history
                    </span>
                    {hist.length >= 2 && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                        {hist.length} snapshots
                      </span>
                    )}
                  </div>
                  <BalanceTrendChart history={hist} color={a.color} />
                </div>
              )}
            </div>
          )
        })}

        {assets.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No assets yet. Add one below.</p>}
        {showAssetForm && <AssetForm retAge={retAge} onSave={async (a) => { await addAsset(a); setShowAssetForm(false) }} onCancel={() => setShowAssetForm(false)} />}
      </Collapsible>
    </div>
  )
}
