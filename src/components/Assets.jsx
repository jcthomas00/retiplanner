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

  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box'
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, padding: 14, background: 'var(--bg-page)', borderRadius: 10 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Vanguard 401(k)" style={inputStyle} required />
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Balance ($)</label>
        <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" style={inputStyle} required min="0" />
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
        <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
          {ASSET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Color</label>
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
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Withdrawal age <span style={{ fontWeight: 400 }}>(optional — leave blank to use retirement age)</span>
        </label>
        <input type="number" value={withdrawalAge} onChange={e => setWithdrawalAge(e.target.value)}
          placeholder={retAge ? `${retAge} (retirement age)` : 'e.g. 72'}
          style={inputStyle} min="50" max="90" />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{
          padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer'
        }}>Cancel</button>
        <button type="submit" style={{
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>Add asset</button>
      </div>
    </form>
  )
}

export default function Assets({ assets, totalBalance, addAsset, deleteAsset, retAge }) {
  const [showAssetForm, setShowAssetForm] = useState(false)

  const typeLabel = (t) => ASSET_TYPES.find(x => x.value === t)?.label || t

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--border)'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Collapsible title="Assets" actions={
        <button onClick={() => setShowAssetForm(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 10px',
          borderRadius: 6, border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text)', cursor: 'pointer'
        }}>+ Add asset</button>
      }>
        {assets.map(a => (
          <div key={a.id} style={rowStyle}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{a.name}</span>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 5,
              background: 'var(--card-alt)', color: 'var(--text-muted)'
            }}>{typeLabel(a.type)}</span>
            {a.withdrawal_age && a.withdrawal_age !== retAge && (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, background: 'var(--card-alt)', color: '#BA7517' }}>
                withdraw at {a.withdrawal_age}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, minWidth: 90, textAlign: 'right' }}>{fmt(a.balance)}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 36, textAlign: 'right' }}>
              {totalBalance > 0 ? Math.round(Number(a.balance) / totalBalance * 100) : 0}%
            </span>
            <button onClick={() => deleteAsset(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }} aria-label="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
          </div>
        ))}

        {assets.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No assets yet. Add one below.</p>}
        {showAssetForm && <AssetForm retAge={retAge} onSave={async (a) => { await addAsset(a); setShowAssetForm(false) }} onCancel={() => setShowAssetForm(false)} />}
      </Collapsible>
    </div>
  )
}
