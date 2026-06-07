import { useState } from 'react'
import { Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  LineElement, PointElement, LinearScale, CategoryScale, Filler
} from 'chart.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileImport, faXmark } from '@fortawesome/free-solid-svg-icons'
import { fmtK, projectValue } from '../lib/finance'
import Assets from './Assets'
import IncomeSources from './IncomeSources'
import PDFImport from './PDFImport'

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale, Filler)

function MetricCard({ label, value, sub, color, onClick, active }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? 'var(--accent)' : 'var(--card-alt)',
        borderRadius: 12, padding: '14px 16px',
        cursor: onClick ? 'pointer' : 'default',
        border: active ? '1px solid var(--accent)' : '1px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ fontSize: 12, color: active ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: active ? '#fff' : (color || 'var(--text)') }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function Overview({
  assets, params, totalBalance, investableBalance, totalContrib,
  addAsset, deleteAsset,
  addContribution, addIncomeSource, updateIncomeSource, deleteIncomeSource,
  incomeSources, saveParams,
}) {
  const [importOpen, setImportOpen] = useState(false)

  const yearsToRet = params.retAge - params.age
  const projected = projectValue(yearsToRet, investableBalance, totalContrib, params.ret / 100)
  const retAssets = assets.filter(a => a.type === 'retirement').reduce((s, a) => s + Number(a.balance), 0)

  const pieData = {
    labels: assets.map(a => a.name),
    datasets: [{
      data: assets.map(a => Number(a.balance)),
      backgroundColor: assets.map(a => a.color),
      borderWidth: 0,
      hoverOffset: 4,
    }]
  }

  // Growth curve
  const totalYears = yearsToRet + 25
  const nwLabels = [], nwVals = []
  let v = investableBalance
  for (let i = 0; i <= totalYears; i++) {
    nwLabels.push(params.age + i)
    nwVals.push(Math.round(v))
    if (params.age + i < params.retAge) v = v * (1 + params.ret / 100) + totalContrib
    else v = Math.max(0, v * (1 + params.postRet / 100) - params.withdraw)
  }

  const nwData = {
    labels: nwLabels,
    datasets: [{
      data: nwVals,
      borderColor: '#1D9E75',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      backgroundColor: 'rgba(29,158,117,0.08)',
      tension: 0.4,
    }]
  }

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtK(c.raw) } } },
    scales: {
      x: { ticks: { maxTicksLimit: 6, font: { size: 11 } }, grid: { display: false } },
      y: { ticks: { callback: v => fmtK(v), font: { size: 11 } }, grid: { color: 'rgba(128,128,128,0.08)' } }
    }
  }

  return (
    <div>
      <style>{`
        .ov-wide-row { display: block; }
        .ov-wide-row > .ov-col { width: 100%; }
        .ov-wide-row > .ov-col + .ov-col { margin-top: 1rem; }
        @media (min-width: 1600px) {
          .ov-wide-row { display: flex; gap: 1rem; align-items: flex-start; }
          .ov-wide-row > .ov-col + .ov-col { margin-top: 0; }
          .ov-wide-row > .ov-col-charts { flex: 0 0 40%; min-width: 0; }
          .ov-wide-row > .ov-col-manage { flex: 1 1 0; min-width: 0; }
        }
      `}</style>

      {/* Metric cards row — Import card at the end */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: '1.5rem' }}>
        <MetricCard label="Net worth" value={fmtK(totalBalance)} />
        <MetricCard label="Retirement assets" value={fmtK(retAssets)} />
        <MetricCard label="Annual contributions" value={fmtK(totalContrib)} />
        <MetricCard label={`At retirement (${params.retAge})`} value={fmtK(projected)} color="#1D9E75" />
        <MetricCard
          label="Import"
          value={<FontAwesomeIcon icon={faFileImport} />}
          onClick={() => setImportOpen(o => !o)}
          active={importOpen}
        />
      </div>

      {/* Import panel — slides in below metric cards */}
      {importOpen && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
          marginBottom: '1.5rem', overflow: 'hidden',
          animation: 'fadeInUp 0.18s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Import from PDF
            </span>
            <button onClick={() => setImportOpen(false)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 15, padding: '0 2px',
            }}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div style={{ padding: '1.25rem' }}>
            <PDFImport
              addAsset={addAsset}
              addContribution={addContribution}
              addIncomeSource={addIncomeSource}
              saveParams={saveParams}
              existingParams={params}
            />
          </div>
        </div>
      )}

      <div className="ov-wide-row">
        <div className="ov-col ov-col-charts" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Projected growth</div>
            <div style={{ position: 'relative', height: 240 }}>
              <Line data={nwData} options={chartOpts} />
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Allocation</div>
            <div style={{ position: 'relative', height: 180 }}>
              <Doughnut data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + fmtK(c.raw) } } }, cutout: '62%' }} />
            </div>
          </div>
        </div>

        <div className="ov-col ov-col-manage" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Assets
            assets={assets}
            totalBalance={totalBalance}
            addAsset={addAsset}
            deleteAsset={deleteAsset}
            retAge={params.retAge}
          />
          <IncomeSources
            incomeSources={incomeSources}
            addIncomeSource={addIncomeSource}
            updateIncomeSource={updateIncomeSource}
            deleteIncomeSource={deleteIncomeSource}
            retAge={params.retAge}
          />
        </div>
      </div>
    </div>
  )
}
