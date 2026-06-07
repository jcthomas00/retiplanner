import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'retiplanner_gemini_key'

// ── localStorage helpers (used as a fast local cache) ──────────────────────
function lsGet() {
  try { return localStorage.getItem(LS_KEY) || '' } catch { return '' }
}
function lsSet(val) {
  try { val ? localStorage.setItem(LS_KEY, val) : localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

// ── Supabase helpers ────────────────────────────────────────────────────────
async function dbGet(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('gemini_key')
    .eq('id', userId)
    .single()
  return data?.gemini_key || ''
}

async function dbSet(userId, key) {
  await supabase
    .from('profiles')
    .upsert({ id: userId, gemini_key: key || null }, { onConflict: 'id' })
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useGeminiKey() {
  // Seed from localStorage immediately so UI doesn't flicker on load
  const [key, setKeyState] = useState(lsGet)
  const [syncing, setSyncing] = useState(false)

  // On mount: pull from DB (authoritative source) and refresh local cache
  useEffect(() => {
    let cancelled = false
    async function sync() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setSyncing(true)
      try {
        const remote = await dbGet(user.id)
        if (!cancelled) {
          lsSet(remote)
          setKeyState(remote)
        }
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }
    sync()
    return () => { cancelled = true }
  }, [])

  const setKey = useCallback(async (newKey) => {
    const trimmed = (newKey || '').trim()
    // Update local state + cache immediately for snappy UI
    lsSet(trimmed)
    setKeyState(trimmed)
    // Persist to DB in the background
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await dbSet(user.id, trimmed)
  }, [])

  const clear = useCallback(async () => {
    lsSet('')
    setKeyState('')
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await dbSet(user.id, '')
  }, [])

  return { key, setKey, clear, hasKey: !!key, syncing }
}
