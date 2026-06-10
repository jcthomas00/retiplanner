import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import { fmt, ASSET_COLORS, ASSET_TYPES } from '../lib/finance'
import Collapsible from './Collapsible'

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

export default function Assets({ assets, totalBalance, addAsset, deleteAsset, retAge }) {
  const [showAssetForm, setShowAssetForm] = useState(false)

  const typeLabel = (t) => ASSET_TYPES.find(x => x.value === t)?.label || t

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Collapsible title="Assets" actions={
        <button onClick={() => setShowAssetForm(v => !v)} className="btn btn-subtle" style={{ fontSize: 12, padding: '6px 13px' }}>+ Add asset</button>
      }>
        {assets.map(a => (
          <div key={a.id} className="list-row">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.name}</span>
            <span className="chip">{typeLabel(a.type)}</span>
            {a.withdrawal_age && a.withdrawal_age !== retAge && (
              <span className="chip" style={{ color: 'var(--warning)' }}>
                withdraw at {a.withdrawal_age}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 90, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(a.balance)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {totalBalance > 0 ? Math.round(Number(a.balance) / totalBalance * 100) : 0}%
            </span>
            <button onClick={() => deleteAsset(a.id)} className="icon-btn danger" aria-label="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
          </div>
        ))}

        {assets.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No assets yet. Add one below.</p>}
        {showAssetForm && <AssetForm retAge={retAge} onSave={async (a) => { await addAsset(a); setShowAssetForm(false) }} onCancel={() => setShowAssetForm(false)} />}
      </Collapsible>
    </div>
  )
}
