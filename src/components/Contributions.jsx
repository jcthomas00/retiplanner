import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import { fmt } from '../lib/finance'
import Collapsible from './Collapsible'

function ContribForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const inputStyle = {
    width: '100%', padding: '9px 11px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg-page)',
    color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box'
  }
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ name, amount: parseFloat(amount) }) }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, padding: 14, background: 'var(--bg-page)', borderRadius: 10 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Account</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 401(k)" style={inputStyle} required />
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Annual amount ($)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={inputStyle} required min="0" />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add</button>
      </div>
    </form>
  )
}

export default function Contributions({ contributions, addContribution, deleteContribution }) {
  const [showContribForm, setShowContribForm] = useState(false)

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 0', borderBottom: '1px solid var(--border)'
  }

  return (
    <Collapsible title="Annual contributions" actions={
      <button onClick={() => setShowContribForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>+ Add</button>
    }>
      {contributions.map(c => (
        <div key={c.id} style={rowStyle}>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{c.name}</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(c.amount)}/yr</span>
          <button onClick={() => deleteContribution(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }} aria-label="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
        </div>
      ))}

      {contributions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No contributions yet.</p>}
      {showContribForm && <ContribForm onSave={async (c) => { await addContribution(c); setShowContribForm(false) }} onCancel={() => setShowContribForm(false)} />}
    </Collapsible>
  )
}
