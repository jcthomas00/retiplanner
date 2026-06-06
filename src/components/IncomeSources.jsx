import { useState } from 'react'
import { fmt, fmtK, INCOME_TYPES, effectiveMonthly, ssClaimingFactor, benefitFromTable } from '../lib/finance'

const SS_FRA = 67
const SS_AGES = [62, 63, 64, 65, 66, 67, 68, 69, 70]

const inp = {
  width: '100%', padding: '9px 11px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg-page)',
  color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

function SSPreview({ monthlyAtBase, baseAge, startAge, benefitTable }) {
  const fromTable = benefitFromTable(benefitTable, startAge)
  if (!monthlyAtBase && fromTable == null) return null
  const pia = monthlyAtBase ? monthlyAtBase / ssClaimingFactor(baseAge) : null
  const formulaAdjusted = pia != null ? pia * ssClaimingFactor(startAge) : null
  const adjusted = fromTable != null ? fromTable : formulaAdjusted
  const pctVsFRA = ((ssClaimingFactor(startAge) / ssClaimingFactor(SS_FRA) - 1) * 100).toFixed(1)
  const color = startAge >= SS_FRA ? '#1D9E75' : '#BA7517'
  return (
    <div style={{ gridColumn: '1/-1', background: 'var(--card-alt)', borderRadius: 8, padding: '10px 14px', fontSize: 12, display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Benefit at age {startAge}{fromTable != null && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>from your statement</span>}
        </span>
        <span style={{ fontWeight: 700, color, fontSize: 14 }}>{fmt(adjusted)}/mo · {fmtK(adjusted * 12)}/yr</span>
      </div>
      {fromTable == null && pia != null && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
          <span>PIA (FRA benefit at 67)</span>
          <span style={{ color }}>{fmt(pia)}/mo &nbsp;·&nbsp; {pctVsFRA}% {startAge >= SS_FRA ? 'bonus' : 'reduction'}</span>
        </div>
      )}
      {fromTable != null && (
        <div style={{ color: 'var(--text-muted)' }}>Using your personalized SSA estimate for this age (interpolated if between table entries) instead of a generic formula.</div>
      )}
      {(startAge < 62 || startAge > 70) && (
        <div style={{ color: '#E24B4A', marginTop: 2 }}>⚠ SS can only be claimed between ages 62–70</div>
      )}
    </div>
  )
}

// Editable grid of personalized per-age benefit amounts for SS (fixed ages 62–70,
// matching the standard SSA statement chart)
function SSBenefitTableEditor({ table, onChange }) {
  const t = table || {}
  return (
    <div style={{ gridColumn: '1/-1' }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
        Personalized benefit by claiming age (from your SSA statement) — optional, overrides the formula estimate
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {SS_AGES.map(age => (
          <div key={age} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 46 }}>Age {age}{age === SS_FRA ? ' (FRA)' : ''}</span>
            <input type="number" min="0" placeholder="$"
              value={t[age] ?? ''}
              onChange={e => {
                const v = e.target.value
                const next = { ...t }
                if (v === '') delete next[age]
                else next[age] = parseFloat(v)
                onChange(Object.keys(next).length ? next : null)
              }}
              style={{ ...inp, padding: '6px 8px', fontSize: 12 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Free-form list of (age, amount) rows — for pensions/annuities whose statements
// quote estimated benefits at a handful of arbitrary retirement-age scenarios
// (e.g. "Early-Age Retirement at 58" vs "Normal-Age Retirement at 65").
function FreeformBenefitTableEditor({ table, onChange, label }) {
  const initialRows = () => {
    const entries = Object.entries(table || {}).map(([a, v]) => ({ age: a, amount: String(v) }))
    return entries.length ? entries : [{ age: '', amount: '' }]
  }
  const [rows, setRows] = useState(initialRows)

  const commit = next => {
    setRows(next)
    const obj = {}
    for (const { age, amount } of next) {
      const a = Number(age), v = Number(amount)
      if (age !== '' && amount !== '' && Number.isFinite(a) && Number.isFinite(v)) obj[a] = v
    }
    onChange(Object.keys(obj).length ? obj : null)
  }

  return (
    <div style={{ gridColumn: '1/-1' }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
        {label || 'Personalized benefit by retirement age (from your statement) — optional, overrides the single estimate'}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min="0" placeholder="Age" value={row.age}
              onChange={e => commit(rows.map((r, j) => j === i ? { ...r, age: e.target.value } : r))}
              style={{ ...inp, padding: '6px 8px', fontSize: 12, maxWidth: 80 }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→ $</span>
            <input type="number" min="0" placeholder="Monthly $" value={row.amount}
              onChange={e => commit(rows.map((r, j) => j === i ? { ...r, amount: e.target.value } : r))}
              style={{ ...inp, padding: '6px 8px', fontSize: 12 }} />
            <button type="button" onClick={() => commit(rows.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px' }}>✕</button>
          </div>
        ))}
        <button type="button"
          onClick={() => setRows([...rows, { age: '', amount: '' }])}
          style={{ alignSelf: 'flex-start', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
          + Add scenario
        </button>
      </div>
    </div>
  )
}

// Generic preview for a personalized benefit table (pensions/annuities)
function TablePreview({ startAge, table }) {
  const fromTable = benefitFromTable(table, startAge)
  if (fromTable == null) return null
  return (
    <div style={{ gridColumn: '1/-1', background: 'var(--card-alt)', borderRadius: 8, padding: '10px 14px', fontSize: 12, display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Benefit at age {startAge}<span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>from your statement</span>
        </span>
        <span style={{ fontWeight: 700, color: '#1D9E75', fontSize: 14 }}>{fmt(fromTable)}/mo · {fmtK(fromTable * 12)}/yr</span>
      </div>
      <div style={{ color: 'var(--text-muted)' }}>Using your personalized estimate for this age (interpolated between known scenarios) instead of a flat single-amount estimate.</div>
    </div>
  )
}

function IncomeForm({ onSave, onCancel, defaultStartAge }) {
  const [type, setType] = useState('social_security')
  const [name, setName] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [baseAge, setBaseAge] = useState(SS_FRA)
  const [startAge, setStartAge] = useState(defaultStartAge ?? SS_FRA)
  const [colaPct, setColaPct] = useState(0)
  const [benefitTable, setBenefitTable] = useState(null)

  const isSS = type === 'social_security'
  const isPensionLike = type === 'pension' || type === 'annuity'
  const minStart = isSS ? 62 : 50
  const maxStart = isSS ? 70 : 85

  return (
    <form onSubmit={e => { e.preventDefault(); if (!name || !monthlyAmount) return; onSave({ type, name, monthly_amount: parseFloat(monthlyAmount), base_age: baseAge, start_age: startAge, cola_pct: colaPct, ...((isSS || isPensionLike) ? { benefit_table: benefitTable } : {}) }) }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12, padding: 14, background: 'var(--bg-page)', borderRadius: 10 }}>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
        <select value={type} onChange={e => setType(e.target.value)} style={inp}>
          {INCOME_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={isSS ? 'My Social Security' : 'State pension'} style={inp} required />
      </div>

      <div>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Monthly benefit ($){isSS ? ` — quoted at age ${baseAge}` : ''}
        </label>
        <input type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(e.target.value)}
          placeholder="2400" style={inp} required min="0" />
      </div>

      {isSS ? (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Quote age (from SS statement)</label>
          <select value={baseAge} onChange={e => setBaseAge(parseInt(e.target.value))} style={inp}>
            {[62, 63, 64, 65, 66, 67, 68, 69, 70].map(a => <option key={a} value={a}>Age {a}{a === SS_FRA ? ' (FRA)' : ''}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>COLA %</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={0} max={5} step={0.25} value={colaPct} onChange={e => setColaPct(parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40 }}>{colaPct.toFixed(2)}%</span>
          </div>
        </div>
      )}

      <div style={{ gridColumn: '1/-1' }}>
        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
          Planned start age: <strong style={{ color: 'var(--text)' }}>{startAge}</strong>
          {isSS && startAge < SS_FRA && <span style={{ color: '#BA7517', marginLeft: 8 }}>Early claiming — reduced benefit</span>}
          {isSS && startAge > SS_FRA && <span style={{ color: '#1D9E75', marginLeft: 8 }}>Delayed claiming — increased benefit</span>}
        </label>
        <input type="range" min={minStart} max={maxStart} step={1} value={startAge}
          onChange={e => setStartAge(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          <span>{minStart}</span><span>{maxStart}</span>
        </div>
      </div>

      {isSS && <SSBenefitTableEditor table={benefitTable} onChange={setBenefitTable} />}
      {isPensionLike && <FreeformBenefitTableEditor table={benefitTable} onChange={setBenefitTable}
        label="Personalized benefit by retirement scenario (from your pension/annuity statement) — optional, e.g. early-age vs normal-age retirement" />}

      {isSS && <SSPreview monthlyAtBase={parseFloat(monthlyAmount)} baseAge={baseAge} startAge={startAge} benefitTable={benefitTable} />}
      {isPensionLike && <TablePreview startAge={startAge} table={benefitTable} />}

      {isSS && (
        <div style={{ gridColumn: '1/-1' }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>COLA % (SS historically ~2–3%)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={0} max={5} step={0.25} value={colaPct} onChange={e => setColaPct(parseFloat(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, minWidth: 40 }}>{colaPct.toFixed(2)}%</span>
          </div>
        </div>
      )}

      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button type="submit" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Add</button>
      </div>
    </form>
  )
}

function IncomeSourceEditor({ source, onSave, onCancel }) {
  const [monthlyAmount, setMonthlyAmount] = useState(source.monthly_amount)
  const [baseAge, setBaseAge] = useState(source.base_age)
  const [startAge, setStartAge] = useState(source.start_age)
  const [colaPct, setColaPct] = useState(source.cola_pct)
  const [benefitTable, setBenefitTable] = useState(source.benefit_table || null)
  const isSS = source.type === 'social_security'
  const isPensionLike = source.type === 'pension' || source.type === 'annuity'

  return (
    <div style={{ padding: '8px 0 4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Monthly ($) at age {isSS ? baseAge : startAge}</label>
        <input type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(parseFloat(e.target.value))}
          style={{ ...inp, padding: '7px 9px' }} />
      </div>
      {isSS && (
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Quote age</label>
          <select value={baseAge} onChange={e => setBaseAge(parseInt(e.target.value))} style={{ ...inp, padding: '7px 9px' }}>
            {[62, 63, 64, 65, 66, 67, 68, 69, 70].map(a => <option key={a} value={a}>Age {a}{a === SS_FRA ? ' (FRA)' : ''}</option>)}
          </select>
        </div>
      )}
      <div style={{ gridColumn: '1/-1' }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Start age: {startAge}</label>
        <input type="range" min={isSS ? 62 : 50} max={isSS ? 70 : 85} step={1} value={startAge}
          onChange={e => setStartAge(parseInt(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </div>
      <div style={{ gridColumn: '1/-1' }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>COLA %: {colaPct.toFixed(2)}</label>
        <input type="range" min={0} max={5} step={0.25} value={colaPct}
          onChange={e => setColaPct(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }} />
      </div>
      {isSS && <SSBenefitTableEditor table={benefitTable} onChange={setBenefitTable} />}
      {isPensionLike && <FreeformBenefitTableEditor table={benefitTable} onChange={setBenefitTable}
        label="Personalized benefit by retirement scenario (from your pension/annuity statement) — optional" />}
      {isSS && <SSPreview monthlyAtBase={monthlyAmount} baseAge={baseAge} startAge={startAge} benefitTable={benefitTable} />}
      {isPensionLike && <TablePreview startAge={startAge} table={benefitTable} />}
      <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
        <button onClick={() => onSave({ monthly_amount: monthlyAmount, base_age: baseAge, start_age: startAge, cola_pct: colaPct, ...((isSS || isPensionLike) ? { benefit_table: benefitTable } : {}) })}
          style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
      </div>
    </div>
  )
}

export default function IncomeSources({ incomeSources, addIncomeSource, updateIncomeSource, deleteIncomeSource, retAge }) {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const typeLabel = t => INCOME_TYPES.find(x => x.value === t)?.label || t

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Guaranteed Income</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Social Security, pensions, annuities</div>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
          + Add
        </button>
      </div>

      {incomeSources.length === 0 && !showForm && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          No guaranteed income sources yet. Add Social Security or pension details to improve projection accuracy.
        </p>
      )}

      {incomeSources.map(src => {
        const monthly = effectiveMonthly(src)
        return (
          <div key={src.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            {editing === src.id ? (
              <IncomeSourceEditor
                source={src}
                onSave={async updates => { await updateIncomeSource(src.id, updates); setEditing(null) }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{src.name}</span>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--card-alt)', color: 'var(--text-muted)' }}>{typeLabel(src.type)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Starts age {src.start_age}
                    {benefitFromTable(src.benefit_table, src.start_age) != null
                      ? (src.type === 'social_security' ? ' · using your personalized SSA estimate' : ' · using your personalized statement estimate')
                      : (src.type === 'social_security' && src.start_age !== src.base_age && ` · adjusted from age-${src.base_age} quote`)}
                    {src.cola_pct > 0 && ` · ${src.cola_pct}% COLA`}
                    {src.start_age > retAge && <span style={{ color: '#BA7517', marginLeft: 6 }}>starts after retirement</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{fmt(monthly)}/mo</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtK(monthly * 12)}/yr</div>
                </div>
                <button onClick={() => setEditing(src.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 4px' }} title="Edit">✎</button>
                <button onClick={() => deleteIncomeSource(src.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px' }}>✕</button>
              </div>
            )}
          </div>
        )
      })}

      {showForm && (
        <IncomeForm
          defaultStartAge={retAge}
          onSave={async s => { await addIncomeSource(s); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
