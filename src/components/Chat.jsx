import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faArrowRotateRight, faComment, faPaperPlane, faKey } from '@fortawesome/free-solid-svg-icons'
import { useGeminiKey } from '../hooks/useGeminiKey'
import GeminiKeyPrompt from './GeminiKeyPrompt'


function buildContext(assets, contributions, incomeSources, params) {
  const totalBalance = assets.reduce((s, a) => s + Number(a.balance), 0)
  const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0)
  return JSON.stringify({
    age: params.age,
    retireAt: params.retAge,
    yearsLeft: params.retAge - params.age,
    assets: assets.map(a => ({
      n: a.name, t: a.type, b: Math.round(Number(a.balance)),
      ...(a.withdrawal_age ? { wa: a.withdrawal_age } : {}),
    })),
    totalAssets: Math.round(totalBalance),
    annualContribs: contributions.map(c => ({ n: c.name, amt: Math.round(Number(c.amount)) })),
    totalAnnualContrib: Math.round(totalContrib),
    incomeSources: (incomeSources || []).map(s => ({
      n: s.name, t: s.type, mo: Math.round(Number(s.monthly_amount)),
      baseAge: s.base_age, startAge: s.start_age,
      ...(s.cola_pct ? { cola: s.cola_pct } : {}),
    })),
    preReturnPct: params.ret,
    postReturnPct: params.postRet,
    inflationPct: params.inf,
    annualWithdrawal: params.withdraw,
    volatilityPct: params.vol,
  })
}

const SYSTEM = `You are a concise retirement planning assistant. You have the user's portfolio context as compact JSON with keys: age, retireAt, yearsLeft, assets[{n=name,t=type,b=balance,wa=withdrawal_age}], totalAssets, annualContribs[{n,amt}], totalAnnualContrib, incomeSources[{n=name,t=type,mo=monthly_amount,baseAge,startAge,cola}], preReturnPct, postReturnPct, inflationPct, annualWithdrawal, volatilityPct. Asset types: retirement,taxable,real_estate,cash,other. Income types: social_security,pension,annuity,other. SS benefits adjust: +8%/yr after FRA(67), -6.67%/yr before. Answer questions about their portfolio, projections, income streams, and retirement strategy. Be specific with numbers. Be thorough but clear — always finish your thought completely; don't truncate mid-sentence.`

async function askGemini(context, messages, apiKey) {
  if (!apiKey) throw new Error('No Gemini API key set')

  const contents = messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: `${SYSTEM}\n\nPortfolio: ${context}` }] },
        contents,
        generationConfig: { maxOutputTokens: 4096 },
      }),
    }
  )
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || `Gemini error ${res.status}`) }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

const SUGGESTIONS = [
  'Am I on track to retire on time?',
  'How much will I have at retirement?',
  "What's my biggest financial risk?",
  'How does inflation affect my plan?',
]

const HISTORY_KEY = 'retiplanner_chat_history'

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export default function Chat({ assets, contributions, incomeSources, params, open, onToggle }) {
  const { key: geminiKey, setKey: setGeminiKey, clear: clearGeminiKey, hasKey } = useGeminiKey()
  const [showKeyPrompt, setShowKeyPrompt] = useState(false)
  const [messages, setMessages] = useState(loadHistory)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [failedQuestion, setFailedQuestion] = useState(null)
  const bottomRef = useRef()
  const inputRef = useRef()

  const context = buildContext(assets, contributions, incomeSources, params)
  const hasMessages = messages.length > 0

  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages)) } catch { /* ignore quota errors */ }
  }, [messages])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  async function send(text) {
    const question = (text ?? input).trim()
    if (!question || loading) return
    if (!hasKey) { setShowKeyPrompt(true); return }
    setInput('')
    setError('')
    setFailedQuestion(null)
    const updated = [...messages, { role: 'user', content: question }]
    setMessages(updated)
    setLoading(true)
    try {
      const reply = await askGemini(context, updated, geminiKey)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message)
      setFailedQuestion(question)
      setMessages(m => m.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function retry() {
    if (!failedQuestion || loading) return
    const q = failedQuestion
    setFailedQuestion(null)
    send(q)
  }

  function clearHistory() {
    setMessages([])
    setError('')
    setFailedQuestion(null)
    try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
  }

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div onClick={onToggle} style={{
          display: 'none',
          position: 'fixed', inset: 0, zIndex: 39,
          background: 'rgba(0,0,0,0.3)',
        }} />
      )}

      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 80, right: 24, zIndex: 40,
        width: 360, maxHeight: '70vh',
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'auto' : 'none',
        transform: open ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        transformOrigin: 'bottom right',
      }}>
        {/* Panel header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Portfolio Chat</span>
            {hasMessages && (
              <button onClick={clearHistory} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
              }}>Clear</button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {hasKey && (
              <button onClick={() => { clearGeminiKey(); setShowKeyPrompt(false) }} title="Remove API key" style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
                border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)',
              }}><FontAwesomeIcon icon={faKey} /></button>
            )}
            <button onClick={onToggle} style={{
              marginLeft: 4, fontSize: 16, lineHeight: 1, padding: '2px 6px', borderRadius: 6,
              border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)',
            }}><FontAwesomeIcon icon={faXmark} /></button>
          </div>
        </div>

        {/* Key prompt — shown when key missing and user tries to chat */}
        {showKeyPrompt && (
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <GeminiKeyPrompt
              context="the AI chat"
              onSave={k => { setGeminiKey(k); setShowKeyPrompt(false) }}
              onDismiss={() => setShowKeyPrompt(false)}
            />
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!hasMessages && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Try asking…</div>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  textAlign: 'left', fontSize: 12, padding: '7px 11px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--border)', background: 'var(--bg-page)',
                  color: 'var(--text-muted)', lineHeight: 1.4,
                }}>{s}</button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '88%', padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.55,
                background: m.role === 'user' ? 'var(--accent)' : 'var(--bg-page)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                borderBottomRightRadius: m.role === 'user' ? 3 : 10,
                borderBottomLeftRadius: m.role === 'assistant' ? 3 : 10,
                whiteSpace: 'pre-wrap',
              }}>{m.content}</div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '8px 14px', borderRadius: 10, borderBottomLeftRadius: 3,
                background: 'var(--bg-page)', border: '1px solid var(--border)',
                fontSize: 16, letterSpacing: 3, color: 'var(--text-muted)',
              }}>···</div>
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 12, color: '#DC2626', padding: '7px 10px', background: '#FEF2F2', borderRadius: 7, border: '1px solid #FECACA' }}>
              <span>{error}</span>
              {failedQuestion && (
                <button onClick={retry} disabled={loading} style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, cursor: loading ? 'default' : 'pointer',
                  border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', opacity: loading ? 0.5 : 1,
                }}><FontAwesomeIcon icon={faArrowRotateRight} /> Retry</button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask about your retirement…"
            rows={1}
            style={{
              flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--bg-page)', color: 'var(--text)', fontSize: 13, resize: 'none',
              fontFamily: 'inherit', outline: 'none', lineHeight: 1.5, maxHeight: 96, overflowY: 'auto',
            }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              padding: '8px 13px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              opacity: (!input.trim() || loading) ? 0.4 : 1, flexShrink: 0,
            }}
          ><FontAwesomeIcon icon={faPaperPlane} /></button>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={onToggle}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 40,
          width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', fontSize: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)' }}
        title="Portfolio Chat"
      >
        <FontAwesomeIcon icon={open ? faXmark : faComment} />
      </button>
    </>
  )
}
