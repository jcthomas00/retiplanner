import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip
} from 'chart.js'
import { useState } from 'react'
import { fmtK, fmt, buildProjection, calcDepletionAge, effectiveMonthly, benefitFromTable } from '../lib/finance'
import Contributions from './Contributions'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

function Slider({ label, min, max, step, value, display, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', display: 'block', accentColor: 'var(--accent)' }} />
    </div>
  )
}

function Section({ title, subtitle, children }) {
  return (
    <div className="card" style={{ marginBottom: '1rem', overflow: 'hidden' }}>
      <div style={{ padding: '1.2rem 1.4rem 0.5rem' }}>
        <div className="card-title">{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>{subtitle}</div>}
      </div>
      <div style={{ padding: '0.5rem 1.4rem 1.4rem' }}>{children}</div>
    </div>
  )
}

function MetricCard({ label, value, sub, color, compact }) {
  return (
    <div className="metric-tile" style={{ padding: compact ? '12px 14px' : '16px 18px' }}>
      <div style={{ fontSize: compact ? 11 : 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: compact ? 3 : 5 }}>{label}</div>
      <div style={{ fontSize: compact ? 19 : 24, fontWeight: 700, letterSpacing: '-0.02em', color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: compact ? 10 : 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text)' }}>
          {source.name} — claim/start at age <strong>{age}</strong>
          {fromTable != null && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--accent)', color: '#fff' }}>from your statement</span>}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1D9E75', whiteSpace: 'nowrap' }}>{fmt(monthly)}/mo · {fmtK(monthly * 12)}/yr</span>
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

export default function Projection({ params, onChange, assets, totalContrib, incomeSources, updateIncomeSource, contributions, addContribution, deleteContribution }) {
  const p = params
  const set = key => val => onChange({ ...p, [key]: val })

  const points = buildProjection(p, assets, totalContrib, incomeSources)
  const [selectedAge, setSelectedAge] = useState(null)
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

  const hasClaimingControls = incomeSources?.some(s => s.type === 'social_security' || s.type === 'pension' || s.type === 'annuity')
  const hasBreakdown = incomeSources?.length > 0 || assets.some(a => a.withdrawal_age && a.withdrawal_age > p.retAge)

  const chartCard = (
    <div className="card" style={{ padding: '1.4rem', marginBottom: '1rem' }}>
      <div className="card-title" style={{ marginBottom: 8 }}>Projected portfolio value</div>
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
          interaction: { mode: 'index', intersect: false },
          onClick: (_evt, elements, chart) => {
            const idx = elements?.[0]?.index ?? chart.scales.x.getValueForPixel(_evt.x)
            const pt = points[Math.round(idx)]
            if (pt) setSelectedAge(pt.age)
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              filter: item => item.raw != null,
              callbacks: {
                title: items => `Age ${items[0]?.label}`,
                label: item => {
                  const pt = points[item.dataIndex]
                  if (!pt) return fmtK(item.raw)
                  const lines = [`Portfolio: ${fmtK(pt.portfolio)}`]
                  if (pt.phase === 'distribution') {
                    lines.push(`Guaranteed income: ${fmt(pt.income)}/yr`)
                    lines.push(`Spending need (infl-adj): ${fmt(pt.grossWithdraw)}/yr`)
                    lines.push(`Net portfolio withdrawal: ${fmt(pt.netWithdraw)}/yr`)
                  } else {
                    lines.push('Phase: Accumulation (saving & growing)')
                  }
                  return lines
                },
              },
            },
          },
          scales: {
            x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { callback: v => fmtK(v), font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.08)' } },
          },
        }} />
      </div>
    </div>
  )

  const settingsSection = (
    <Section title="Settings" subtitle="Age, returns, inflation, spending target & income claiming ages">
      <Slider label="Current age" min={18} max={70} step={1} value={p.age} display={`${p.age} yrs`} onChange={set('age')} />
      <Slider label="Retirement age" min={50} max={85} step={1} value={p.retAge} display={`${p.retAge} yrs`} onChange={set('retAge')} />
      <Slider label="Annual return (pre-retirement)" min={1} max={15} step={0.5} value={p.ret} display={`${p.ret.toFixed(1)}%`} onChange={set('ret')} />
      <Slider label="Annual return (post-retirement)" min={0} max={10} step={0.5} value={p.postRet} display={`${p.postRet.toFixed(1)}%`} onChange={set('postRet')} />
      <Slider label="Inflation rate" min={0} max={8} step={0.25} value={p.inf} display={`${p.inf.toFixed(2)}%`} onChange={set('inf')} />
      <Slider label="Target annual spending" min={20000} max={300000} step={5000} value={p.withdraw} display={fmtK(p.withdraw) + '/yr'} onChange={set('withdraw')} />

      {contributions && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
          <Contributions
            contributions={contributions}
            addContribution={addContribution}
            deleteContribution={deleteContribution}
          />
        </div>
      )}

      {hasClaimingControls && (
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
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
    </Section>
  )

  const breakdownSection = hasBreakdown && (() => {
    const viewAge = selectedAge ?? p.retAge
    const viewPoint = points.find(pt => pt.age === viewAge) || retPoint
    const isDistribution = viewPoint?.phase === 'distribution'
    return (
      <Section
        title="Income & withdrawal breakdown"
        subtitle={`Click an age on the chart to inspect it — currently showing age ${viewAge}${selectedAge == null ? ' (retirement)' : ''}`}
      >
        {!isDistribution ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            At age {viewAge} you're still in the accumulation phase — contributions and growth, no portfolio withdrawals yet.
            <div style={{ marginTop: 6 }}>Portfolio value: <strong style={{ color: 'var(--text)' }}>{fmt(viewPoint?.portfolio ?? 0)}</strong></div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Spending need at age {viewAge} (inflation-adjusted)</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(viewPoint.grossWithdraw)}/yr</span>
            </div>
            {incomeSources?.filter(s => s.start_age <= viewAge).map(src => (
              <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#1D9E75' }}>
                <span>– {src.name} (started age {src.start_age})</span>
                <span style={{ fontWeight: 500 }}>–{fmt(effectiveMonthly(src) * 12)}/yr</span>
              </div>
            ))}
            {incomeSources?.filter(s => s.start_age > viewAge).map(src => (
              <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#BA7517' }}>
                <span>– {src.name} (starts age {src.start_age}, not yet)</span>
                <span style={{ fontWeight: 500, fontSize: 11 }}>kicks in later</span>
              </div>
            ))}
            {assets.filter(a => a.withdrawal_age && a.withdrawal_age > viewAge).map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', color: '#BA7517' }}>
                <span>– {a.name} locked until age {a.withdrawal_age}</span>
                <span style={{ fontWeight: 500, fontSize: 11 }}>unlocks at {a.withdrawal_age}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text)' }}>
              <span>Net from portfolio at age {viewAge}</span>
              <span>{fmt(viewPoint.netWithdraw)}/yr</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
              <span>Portfolio value at age {viewAge}</span>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmt(viewPoint.portfolio)}</span>
            </div>
          </div>
        )}
      </Section>
    )
  })()

  return (
    <div>
      {/* Side-by-side layout (chart | settings) on extra-wide screens; stacks below 1600px */}
      <style>{`
        .proj-wide-row { display: block; }
        .proj-wide-row > .proj-col { width: 100%; }
        @media (min-width: 1600px) {
          .proj-wide-row { display: flex; gap: 1rem; align-items: flex-start; }
          .proj-wide-row > .proj-col { flex: 1 1 0; min-width: 0; }
        }
      `}</style>

      {/* Chart + reactive breakdown (left/top) + Settings (right/below) */}
      <div className="proj-wide-row">
        <div className="proj-col">
          {/* Headline metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: '1rem' }}>
            <MetricCard compact label="Years to retirement" value={p.retAge - p.age} />
            <MetricCard compact label="Portfolio at retirement" value={fmtK(atRet)} color="#1D9E75" />
            <MetricCard
              compact
              label="Net withdrawal rate"
              value={`${wr.toFixed(1)}%`}
              color={wr > 4 ? '#A32D2D' : '#3B6D11'}
              sub={wr > 4 ? 'Above 4% rule' : 'Within 4% rule'}
            />
            <MetricCard compact label="Portfolio depletes at" value={depletionAge > 119 ? '120+' : depletionAge} sub="age" />
          </div>

          {chartCard}
          {breakdownSection}
        </div>
        <div className="proj-col">{settingsSection}</div>
      </div>
    </div>
  )
}
