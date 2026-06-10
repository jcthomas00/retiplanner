import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-regular-svg-icons'
import { fmt } from '../lib/finance'
import Collapsible from './Collapsible'

function ContribForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ name, amount: parseFloat(amount) }) }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, padding: 16, background: 'var(--card-alt)', borderRadius: 'var(--radius-inner)' }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Account</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 401(k)" required />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Annual amount ($)</label>
        <input className="input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required min="0" />
      </div>
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Cancel</button>
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px' }}>Add</button>
      </div>
    </form>
  )
}

export default function Contributions({ contributions, addContribution, deleteContribution }) {
  const [showContribForm, setShowContribForm] = useState(false)

  return (
    <Collapsible title="Annual contributions" actions={
      <button onClick={() => setShowContribForm(v => !v)} className="btn btn-subtle" style={{ fontSize: 12, padding: '6px 13px' }}>+ Add</button>
    }>
      {contributions.map(c => (
        <div key={c.id} className="list-row">
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</span>
          <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(c.amount)}/yr</span>
          <button onClick={() => deleteContribution(c.id)} className="icon-btn danger" aria-label="Delete"><FontAwesomeIcon icon={faTrashCan} /></button>
        </div>
      ))}

      {contributions.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No contributions yet.</p>}
      {showContribForm && <ContribForm onSave={async (c) => { await addContribution(c); setShowContribForm(false) }} onCancel={() => setShowContribForm(false)} />}
    </Collapsible>
  )
}
