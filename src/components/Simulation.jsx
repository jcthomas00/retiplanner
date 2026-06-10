import { useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip
} from 'chart.js'
import { fmtK, runMonteCarlo } from '../lib/finance'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

function MetricCard({ label, value, sub, color }) {
  return (
    <div className="metric-tile" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function OutcomeBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--card-alt)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: 8, borderRadius: 4, background: color, width: `${Math.min(100, pct)}%`, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export default function Simulation({ params, onChange, assets, totalContrib, incomeSources }) {
  const [vol, setVol] = useState(params.vol)
  const [numSims, setNumSims] = useState(500)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState(null)

  const simParams = { ...params, vol }

  const run = () => {
    setRunning(true)
    setTimeout(() => {
      const r = runMonteCarlo(simParams, assets, totalContrib, incomeSources, numSims)
      setResults(r)
      setRunning(false)
    }, 0)
  }

  const pctSuccess = results ? Math.round(results.survived / numSims * 100) : null
  const medFinal = results ? results.bands[2][results.bands[2].length - 1] : null
  const p90Final = results ? results.bands[4][results.bands[4].length - 1] : null
  const p10Final = results ? results.bands[0][results.bands[0].length - 1] : null

  const chartData = results ? {
    labels: results.labels,
    datasets: [
      { label: '90th pct', data: results.bands[4], borderColor: '#9FE1CB', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
      { label: '75th pct', data: results.bands[3], borderColor: '#1D9E75', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
      { label: 'Median', data: results.bands[2], borderColor: '#1D9E75', borderWidth: 2.5, pointRadius: 0, borderDash: [4, 3], fill: false, tension: 0.3 },
      { label: '25th pct', data: results.bands[1], borderColor: '#FAC775', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
      { label: '10th pct', data: results.bands[0], borderColor: '#EF9F27', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.3 },
    ]
  } : null

  const startBalance = results?.startBalance ?? 0
  const outcomes = results ? [
    { label: 'Excellent (>2× starting portfolio)', pct: results.finalVals.filter(v => v > 2 * startBalance).length / numSims * 100, color: '#1D9E75' },
    { label: 'Good (1–2× starting portfolio)', pct: results.finalVals.filter(v => v > startBalance && v <= 2 * startBalance).length / numSims * 100, color: '#5DCAA5' },
    { label: 'Break even (>$0, <1× start)', pct: results.finalVals.filter(v => v > 0 && v <= startBalance).length / numSims * 100, color: '#FAC775' },
    { label: 'Depleted ($0)', pct: results.finalVals.filter(v => v <= 0).length / numSims * 100, color: '#E24B4A' },
  ] : []

  return (
    <div>
      <div className="card" style={{ padding: '1.4rem', marginBottom: '1rem' }}>
        <div className="card-title" style={{ marginBottom: '1.1rem' }}>Monte Carlo settings</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Return volatility (std dev)</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{vol.toFixed(1)}%</span>
          </div>
          <input type="range" min={1} max={20} step={0.5} value={vol}
            onChange={e => setVol(parseFloat(e.target.value))}
            style={{ width: '100%', display: 'block', accentColor: 'var(--accent)' }} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>Number of simulations</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{numSims}</span>
          </div>
          <input type="range" min={100} max={2000} step={100} value={numSims}
            onChange={e => setNumSims(parseInt(e.target.value))}
            style={{ width: '100%', display: 'block', accentColor: 'var(--accent)' }} />
        </div>

        <button onClick={run} disabled={running} className="btn btn-primary">
          {running ? 'Running...' : `Run ${numSims.toLocaleString()} simulations`}
        </button>
      </div>

      {!results && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: 14 }}>
          Configure the settings above and click "Run simulations" to see outcomes.
        </div>
      )}

      {results && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1rem' }}>
            <MetricCard label="Success rate" value={`${pctSuccess}%`}
              color={pctSuccess >= 80 ? '#3B6D11' : pctSuccess >= 60 ? '#BA7517' : '#A32D2D'}
              sub="portfolio survives 30 yrs" />
            <MetricCard label="Median final balance" value={fmtK(Math.max(0, medFinal))} />
            <MetricCard label="Best 10% outcome" value={fmtK(p90Final)} color="#3B6D11" />
            <MetricCard label="Worst 10% outcome" value={p10Final > 0 ? fmtK(p10Final) : '$0'} color={p10Final > 0 ? '#BA7517' : '#A32D2D'} />
          </div>

          <div className="card" style={{ padding: '1.4rem', marginBottom: '1rem' }}>
            <div className="card-title" style={{ marginBottom: 8 }}>Simulation bands</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              {[['#9FE1CB','90th pct'],['#1D9E75','75th pct'],['#1D9E75','Median (dashed)'],['#FAC775','25th pct'],['#EF9F27','10th pct']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c }} />{l}
                </span>
              ))}
            </div>
            <div style={{ position: 'relative', height: 300 }}>
              <Line data={chartData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmtK(c.raw) } } },
                scales: {
                  x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
                  y: { ticks: { callback: v => fmtK(v), font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.08)' } }
                }
              }} />
            </div>
          </div>

          <div className="card" style={{ padding: '1.4rem' }}>
            <div className="card-title" style={{ marginBottom: '1rem' }}>Outcome distribution</div>
            {outcomes.map(o => <OutcomeBar key={o.label} {...o} />)}
          </div>
        </>
      )}
    </div>
  )
}
