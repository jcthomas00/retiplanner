import { useState, useRef } from 'react'
import { useGeminiKey } from '../hooks/useGeminiKey'
import GeminiKeyPrompt from './GeminiKeyPrompt'

const ASSET_COLORS = ['#1D9E75', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']


async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text
}

const SYSTEM_PROMPT = `You are a financial data extraction assistant. Analyze this financial document and extract structured data for a retirement planning app.

Extract and categorize all relevant financial information into this exact JSON structure:

{
  "assets": [
    {
      "name": "Account/Asset name",
      "type": "retirement|taxable|real_estate|cash|other",
      "balance": 12345.67,
      "color": "#1D9E75"
    }
  ],
  "contributions": [
    {
      "name": "Contribution source name",
      "amount": 500.00
    }
  ],
  "income_sources": [
    {
      "name": "Social Security",
      "type": "social_security",
      "monthly_amount": 2400,
      "base_age": 67,
      "start_age": 67,
      "cola_pct": 2.5,
      "benefit_table": {"62": 2627, "63": 2840, "64": 3070, "65": 3369, "66": 3674, "67": 3982, "68": 4321, "69": 4693, "70": 5095}
    },
    {
      "name": "State Pension",
      "type": "pension",
      "monthly_amount": 1800,
      "base_age": 65,
      "start_age": 65,
      "cola_pct": 0,
      "benefit_table": {"58": 357, "65": 759, "70": 2466}
    }
  ],
  "projection_params": {
    "age": 35,
    "ret_age": 65,
    "pre_return": 7,
    "post_return": 4,
    "inflation": 3,
    "annual_withdrawal": 80000,
    "volatility": 10
  }
}

Asset type classification:
- "retirement": 401k, IRA, Roth IRA, 403b, pension account, SEP-IRA, SIMPLE IRA
- "taxable": brokerage accounts, stocks, ETFs, mutual funds (non-retirement)
- "real_estate": property, home equity, REITs
- "cash": savings, checking, money market, CDs, HSA
- "other": crypto, collectibles, business equity, anything else

Income source type classification:
- "social_security": any Social Security benefit statement
- "pension": defined benefit pension plan
- "annuity": annuity contracts
- "other": any other guaranteed income

Rules:
- Only include fields you found data for. Use empty arrays if none found. Use null for projection_params if not found.
- For Social Security: monthly_amount is the benefit shown at a specific age (base_age). SS statements typically show benefit at 62, FRA (67), and 70.
- IMPORTANT — Social Security personalized benefit table: Many SSA statements ("Your Social Security Statement") include a chart/table of the user's PERSONALIZED estimated monthly benefit at EACH claiming age from 62 through 70 (e.g. a bar chart with 9 values, one per age 62,63,64,65,66,67,68,69,70). If you find such a table/chart, extract ALL the age→amount pairs you can find into "benefit_table" as an object mapping age (string) to monthly dollar amount (number), e.g. {"62": 2627, "63": 2840, ..., "70": 5095}. This personalized table is more accurate than a generic formula and should always be captured when present, even if you also fill in monthly_amount/base_age from the same data. Omit "benefit_table" entirely if no such per-age table/chart is present in the document.
- For pension: monthly_amount is the benefit at start_age.
- IMPORTANT — Pension/annuity personalized benefit tables: Pension annual statements (e.g. Teacher Retirement System, other defined-benefit plan statements) often show MULTIPLE estimated monthly benefit scenarios at different retirement ages — e.g. "Early-Age (Reduced) Retirement" vs "Normal-Age (Unreduced) Retirement", each with a "First Eligibility Date" (convert to an approximate age using the participant's age/birthdate if available, or the years-until-eligibility) and an "Estimated Monthly Retirement Benefit". When you find such scenarios, extract them ALL into "benefit_table" as an object mapping the approximate retirement age (string) to the estimated monthly dollar amount (number), e.g. {"58": 357, "65": 759, "70": 2466}. Prefer "Benefits Based on Current Service" figures (not "Projected Service" which assumes future work) unless current-service figures aren't available. This personalized table is more accurate than a single estimate and should be captured whenever a statement shows benefit estimates at more than one retirement age/scenario. Omit "benefit_table" if only a single benefit estimate is present.
- Balance and amount values must be numbers (no $ or commas).
- Annual contribution amounts are per-year estimates.
- Assign varied colors from: #1D9E75, #3B82F6, #F59E0B, #EF4444, #8B5CF6, #EC4899, #14B8A6, #F97316
- If no meaningful financial data found, return {"assets":[],"contributions":[],"income_sources":[],"projection_params":null}
- Respond with only the JSON object, no other text.`

async function analyzeWithGemini(pdfText, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: `Document text:\n${pdfText.slice(0, 50000)}` }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No text response from Gemini')

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse JSON from Gemini response')

  return JSON.parse(jsonMatch[0])
}

const field = (label, value, unit = '') => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value != null ? `${value}${unit}` : '—'}</span>
  </div>
)

export default function PDFImport({ addAsset, addContribution, addIncomeSource, saveParams, existingParams }) {
  const { key: geminiKey, setKey: setGeminiKey, hasKey } = useGeminiKey()
  const [status, setStatus] = useState('idle') // idle | extracting | analyzing | preview | importing | done | error
  const [extracted, setExtracted] = useState(null)
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')
  const [selected, setSelected] = useState({ assets: [], contributions: [], income: [], params: true })
  const fileRef = useRef()

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      setStatus('error')
      return
    }
    setFileName(file.name)
    setError('')
    try {
      setStatus('extracting')
      const text = await extractTextFromPDF(file)
      if (!text.trim()) throw new Error('Could not extract text from PDF. It may be a scanned image.')

      setStatus('analyzing')
      const data = await analyzeWithGemini(text, geminiKey)

      setExtracted(data)
      setSelected({
        assets: data.assets.map((_, i) => i),
        contributions: data.contributions.map((_, i) => i),
        income: (data.income_sources || []).map((_, i) => i),
        params: !!data.projection_params,
      })
      setStatus('preview')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  async function handleImport() {
    setStatus('importing')
    try {
      for (const i of selected.assets) {
        const a = extracted.assets[i]
        await addAsset({ name: a.name, type: a.type, balance: a.balance, color: a.color || ASSET_COLORS[i % ASSET_COLORS.length] })
      }
      for (const i of selected.contributions) {
        const c = extracted.contributions[i]
        await addContribution({ name: c.name, amount: c.amount })
      }
      for (const i of selected.income) {
        const src = extracted.income_sources[i]
        await addIncomeSource(src)
      }
      if (selected.params && extracted.projection_params) {
        await saveParams({ ...existingParams, ...extracted.projection_params })
      }
      setStatus('done')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function reset() {
    setStatus('idle')
    setExtracted(null)
    setError('')
    setFileName('')
    fileRef.current.value = ''
  }

  function toggleAsset(i) {
    setSelected(s => ({
      ...s,
      assets: s.assets.includes(i) ? s.assets.filter(x => x !== i) : [...s.assets, i],
    }))
  }

  function toggleContrib(i) {
    setSelected(s => ({
      ...s,
      contributions: s.contributions.includes(i) ? s.contributions.filter(x => x !== i) : [...s.contributions, i],
    }))
  }

  function toggleIncome(i) {
    setSelected(s => ({
      ...s,
      income: s.income.includes(i) ? s.income.filter(x => x !== i) : [...s.income, i],
    }))
  }

  const hasAny = extracted && (extracted.assets.length > 0 || extracted.contributions.length > 0 || (extracted.income_sources || []).length > 0 || extracted.projection_params)
  const analyzingLabel = 'Analyzing with Gemini…'
  const noDataLabel = `Gemini couldn't find financial data in this document. Try a different PDF.`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>Import from PDF</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Upload a financial statement, account summary, or portfolio PDF. AI will extract and categorize your data.
        </p>
      </div>

      {/* Key prompt — shown when key is missing */}
      {!hasKey && (status === 'idle' || status === 'error') && (
        <div style={{ marginBottom: 20 }}>
          <GeminiKeyPrompt
            context="PDF import"
            onSave={k => setGeminiKey(k)}
          />
        </div>
      )}

      {/* Upload area */}
      {(status === 'idle' || status === 'error') && (
        <div
          onClick={() => hasKey && fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); if (hasKey) handleFile(e.dataTransfer.files[0]) }}
          style={{
            opacity: hasKey ? 1 : 0.45, pointerEvents: hasKey ? 'auto' : 'none',
            border: '2px dashed var(--border)', borderRadius: 12, padding: '3rem 2rem',
            textAlign: 'center', cursor: 'pointer', background: 'var(--card)',
            transition: 'border-color 0.15s',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Drop a PDF here or click to browse
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Account statements, portfolio summaries, tax documents
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Processing states */}
      {(status === 'extracting' || status === 'analyzing' || status === 'importing') && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 28, marginBottom: 16 }}>
            {status === 'extracting' ? '📖' : status === 'analyzing' ? '🧠' : '💾'}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {status === 'extracting' && 'Extracting text from PDF…'}
            {status === 'analyzing' && analyzingLabel}
            {status === 'importing' && 'Saving to database…'}
          </div>
          {fileName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fileName}</div>}
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginTop: 12, fontSize: 13, color: '#DC2626' }}>
          {error}
        </div>
      )}

      {/* Done */}
      {status === 'done' && (
        <div style={{ background: 'var(--card)', borderRadius: 12, padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Import complete!</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
            Your data has been added to the dashboard.
          </div>
          <button onClick={reset} style={{
            fontSize: 13, padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)'
          }}>Import another file</button>
        </div>
      )}

      {/* Preview */}
      {status === 'preview' && extracted && (
        <div>
          {!hasAny ? (
            <div style={{ background: 'var(--card)', borderRadius: 12, padding: '2rem', textAlign: 'center', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🤔</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{noDataLabel}</div>
              <button onClick={reset} style={{
                marginTop: 16, fontSize: 13, padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)'
              }}>Try another file</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Gemini found the following data in <strong style={{ color: 'var(--text)' }}>{fileName}</strong>. Select what to import.
              </div>

              {/* Assets */}
              {extracted.assets.length > 0 && (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Assets ({extracted.assets.length})
                  </div>
                  {extracted.assets.map((a, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < extracted.assets.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={selected.assets.includes(i)} onChange={() => toggleAsset(i)} />
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color || '#1D9E75', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.type}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        ${Number(a.balance).toLocaleString()}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Contributions */}
              {extracted.contributions.length > 0 && (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Annual Contributions ({extracted.contributions.length})
                  </div>
                  {extracted.contributions.map((c, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < extracted.contributions.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={selected.contributions.includes(i)} onChange={() => toggleContrib(i)} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        ${Number(c.amount).toLocaleString()}/yr
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Income sources */}
              {(extracted.income_sources || []).length > 0 && (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    Guaranteed Income ({extracted.income_sources.length})
                  </div>
                  {extracted.income_sources.map((src, i) => (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                      borderBottom: i < extracted.income_sources.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <input type="checkbox" checked={selected.income.includes(i)} onChange={() => toggleIncome(i)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{src.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {src.type.replace('_', ' ')} · starts age {src.start_age}
                          {src.cola_pct > 0 ? ` · ${src.cola_pct}% COLA` : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        ${Number(src.monthly_amount).toLocaleString()}/mo
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Projection params */}
              {extracted.projection_params && (
                <div style={{ background: 'var(--card)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selected.params} onChange={() => setSelected(s => ({ ...s, params: !s.params }))} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Projection Parameters</div>
                  </label>
                  <div style={{ padding: '8px 16px' }}>
                    {extracted.projection_params.age != null && field('Current age', extracted.projection_params.age)}
                    {extracted.projection_params.ret_age != null && field('Retirement age', extracted.projection_params.ret_age)}
                    {extracted.projection_params.pre_return != null && field('Pre-retirement return', extracted.projection_params.pre_return, '%')}
                    {extracted.projection_params.post_return != null && field('Post-retirement return', extracted.projection_params.post_return, '%')}
                    {extracted.projection_params.inflation != null && field('Inflation rate', extracted.projection_params.inflation, '%')}
                    {extracted.projection_params.annual_withdrawal != null && field('Annual withdrawal', `$${Number(extracted.projection_params.annual_withdrawal).toLocaleString()}`)}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={reset} style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)'
                }}>Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={selected.assets.length === 0 && selected.contributions.length === 0 && selected.income.length === 0 && !selected.params}
                  style={{
                    fontSize: 13, padding: '8px 20px', borderRadius: 8, cursor: 'pointer',
                    border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600,
                    opacity: (selected.assets.length === 0 && selected.contributions.length === 0 && selected.income.length === 0 && !selected.params) ? 0.5 : 1
                  }}
                >
                  Import Selected
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
