import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip
} from 'chart.js'
import { useState } from 'react'
import { fmtK, fmt, buildProjection, calcDepletionAge, effectiveMonthly, benefitFromTable } from '../lib/finance'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

function Slider({ label, min, max, step, value, display, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 200 }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }} />
      <span style={{ fontSize: 13, fontWeight: 500, minWidth: 70, textAlign: 'right', color: 'var(--text)' }}>{display}</span>
    </div>
  )
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--card-alt)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function ClaimingAgeControl({ source, onCommit }) {
  const [age, setAge] = useState(source.start_age)
  const isSS = source.type === 'social_security'
  const min = isSS ? 62 : 50
  const max = isSS ? 70 : 85
  const previewSource = { ...source, start_age: age }
  const monthly = effectiveMonthly(previewSource)
  const fromTable = benefitFromTable(source.benefit_table, age)

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {source.name} — claim/start at age <strong>{age}</strong>
          {fromTable != null && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>from your statement</span>}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>{fmt(monthly)}/mo · {fmtK(monthly * 12)}/yr</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={age}
        onChange={e => setAge(parseInt(e.target.value))}
        onMouseUp={() => onCommit(source.id, parseInt(age))}
        onTouchEnd={() => onCommit(source.id, parseInt(age))}
        style={{ width: '100%', accentColor: 'var(--accent)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

export default function Projection({ params, onChange, assets, totalContrib, incomeSources, updateIncomeSource }) {
  const p = params
  const set = key => val => onChange({ ...p, [key]: val })

  const points = buildProjection(p, assets, totalContrib, incomeSources)
  const retPoint = points.find(pt => pt.age === p.retAge)
  const atRet = retPoint?.portfolio ?? 0
  const depletionAge = calcDepletionAge(points)

  // Gross withdrawal need vs effective net at retirement age
  const netWithdrawAtRet = points.find(pt => pt.phase === 'distribution')?.netWithdraw ?? p.withdraw
  const incomeAtRet = points.find(pt => pt.phase === 'distribution')?.income ?? 0
  const wr = atRet > 0 ? (netWithdrawAtRet / atRet * 100) : 0

  // Show the concrete effect of delayed-start income sources kicking in (e.g. Social Security)
  const delayedSources = (incomeSources || []).filter(s => s.start_age > p.retAge)
  const delayedKickIns = delayedSources.map(src => {
    const before = points.find(pt => pt.age === src.start_age - 1)
    const after = points.find(pt => pt.age === src.start_age)
    return { src, before, after }
  }).filter(d => d.before && d.after)

  // Chart data
  const labels = points.map(pt => pt.age)
  const preData = points.map(pt => pt.phase === 'accumulation' ? pt.portfolio : null)
  const postData = points.map(pt => pt.phase === 'distribution' ? pt.portfolio : null)

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accumulation', data: preData, borderColor: '#378ADD',
        borderWidth: 2.5, pointRadius: 0, fill: true,
        backgroundColor: 'rgba(55,138,221,0.07)', spanGaps: true, tension: 0.3,
      },
      {
        label: 'Withdrawal', data: postData, borderColor: '#1D9E75',
        borderWidth: 2.5, pointRadius: 0, fill: true,
        backgroundColor: 'rgba(29,158,117,0.07)', spanGaps: true, tension: 0.3,
      },
    ],
  }

  // Total guaranteed income at retirement
  const totalGuaranteedAtRet = incomeSources?.reduce((s, src) => {
    const monthly = src.start_age <= p.retAge ? effectiveMonthly(src) : 0
    return s + monthly * 12
  }, 0) ?? 0

  return (
    <div>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Settings</div>
        <Slider label="Current age" min={18} max={70} step={1} value={p.age} display={`${p.age} yrs`} onChange={set('age')} />
        <Slider label="Retirement age" min={50} max={85} step={1} value={p.retAge} display={`${p.retAge} yrs`} onChange={set('retAge')} />
        <Slider label="Annual return (pre-retirement)" min={1} max={15} step={0.5} value={p.ret} display={`${p.ret.toFixed(1)}%`} onChange={set('ret')} />
        <Slider label="Annual return (post-retirement)" min={0} max={10} step={0.5} value={p.postRet} display={`${p.postRet.toFixed(1)}%`} onChange={set('postRet')} />
        <Slider label="Inflation rate" min={0} max={8} step={0.25} value={p.inf} display={`${p.inf.toFixed(2)}%`} onChange={set('inf')} />
        <Slider label="Target annual spending" min={20000} max={300000} step={5000} value={p.withdraw} display={fmtK(p.withdraw) + '/yr'} onChange={set('withdraw')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1rem' }}>
        <MetricCard label="Years to retirement" value={p.retAge - p.age} />
        <MetricCard label="Portfolio at retirement" value={fmtK(atRet)} color="#1D9E75" />
        <MetricCard
          label="Net withdrawal rate"
          value={`${wr.toFixed(1)}%`}
          color={wr > 4 ? '#A32D2D' : '#3B6D11'}
          sub={wr > 4 ? 'Above 4% rule' : 'Within 4% rule'}
        />
        <MetricCard label="Portfolio depletes at" value={depletionAge > 119 ? '120+' : depletionAge} sub="age" />
      </div>

      {incomeSources?.some(s => s.type === 'social_security' || s.type === 'pension' || s.type === 'annuity') && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Claiming / start age</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            Adjust when you start taking Social Security, your pension, or an annuity. The app pulls your monthly benefit at that age from your personalized statement (when available) and subtracts it from the spending you'd otherwise need to withdraw from your portfolio.
          </div>
          {incomeSources.filter(s => s.type === 'social_security' || s.type === 'pension' || s.type === 'annuity').map(src => (
            <ClaimingAgeControl
              key={src.id}
              source={src}
              onCommit={(id, age) => updateIncomeSource(id, { start_age: age })}
            />
          ))}
        </div>
      )}

      {(incomeSources?.length > 0 || assets.some(a => a.withdrawal_age && a.withdrawal_age > p.retAge)) && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Income & withdrawal breakdown</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Target annual spending (inflation-adjusted at retirement)</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(p.withdraw)}/yr</span>
            </div>
            {incomeSources?.filter(s => s.start_age <= p.retAge).map(src => (
              <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#1D9E75' }}>
                <span>– {src.name} (starts age {src.start_age})</span>
                <span style={{ fontWeight: 500 }}>–{fmt(effectiveMonthly(src) * 12)}/yr</span>
              </div>
            ))}
            {incomeSources?.filter(s => s.start_age > p.retAge).map(src => (
              <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#BA7517' }}>
                <span>– {src.name} (starts age {src.start_age}, delayed)</span>
                <span style={{ fontWeight: 500, fontSize: 11 }}>kicks in later</span>
              </div>
            ))}
            {assets.filter(a => a.withdrawal_age && a.withdrawal_age > p.retAge).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#BA7517' }}>
                <span>– {a.name} locked until age {a.withdrawal_age}</span>
                <span style={{ fontWeight: 500, fontSize: 11 }}>unlocks at {a.withdrawal_age}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text)' }}>
              <span>Net from portfolio at retirement</span>
              <span>{fmt(netWithdrawAtRet)}/yr</span>
            </div>
          </div>

          {delayedKickIns.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Effect of delayed income kicking in
              </div>
              {delayedKickIns.map(({ src, before, after }) => (
                <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    At age {src.start_age}, {src.name} starts paying <strong style={{ color: '#1D9E75' }}>{fmt(after.income)}/yr</strong> —
                    portfolio withdrawal drops from <strong style={{ color: 'var(--text)' }}>{fmt(before.netWithdraw)}/yr</strong> (age {before.age})
                    {' '}to <strong style={{ color: '#1D9E75' }}>{fmt(after.netWithdraw)}/yr</strong> (age {after.age})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Projected portfolio value</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#378ADD' }} />Accumulation
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1D9E75' }} />Withdrawal
          </span>
          {totalGuaranteedAtRet > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              · {fmtK(totalGuaranteedAtRet)}/yr guaranteed income reduces portfolio draw
            </span>
          )}
        </div>
        <div style={{ position: 'relative', height: 280 }}>
          <Line data={chartData} options={{
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtK(c.raw) } } },
            scales: {
              x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
              y: { ticks: { callback: v => fmtK(v), font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.08)' } },
            },
          }} />
        </div>
      </div>
    </div>
  )
}
