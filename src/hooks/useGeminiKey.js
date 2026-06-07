import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const LS_KEY = 'retiplanner_gemini_key'

// ── localStorage helpers (fast local cache) ────────────────────────────────
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
  // Returns null if no row yet — caller must distinguish null vs empty string
  return data ? (data.gemini_key || '') : null
}

async function dbSet(userId, key) {
  await supabase
    .from('profiles')
    .upsert({ id: userId, gemini_key: key || null }, { onConflict: 'id' })
}

// ── Hook ────────────────────────────────────────────────────────────────────
export function useGeminiKey() {
  const [key, setKeyState] = useState(lsGet)
  const [syncing, setSyncing] = useState(false)

  // On mount: sync with DB.
  // - If DB has a key → use it (overrides stale local cache)
  // - If DB has no row yet but localStorage has a key → push local key up to DB
  // - If neither has a key → stay empty
  useEffect(() => {
    let cancelled = false
    async function sync() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      setSyncing(true)
      try {
        const remote = await dbGet(user.id)
        if (cancelled) return

        if (remote === null) {
          // No profile row yet — create one, uploading any locally cached key
          const local = lsGet()
          await dbSet(user.id, local)
          // State already reflects local value, nothing more to do
        } else if (remote) {
          // DB has a key — treat as authoritative, refresh local cache
          lsSet(remote)
          setKeyState(remote)
        }
        // remote === '' means DB row exists but key is blank — keep local state as-is
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }
    sync()
    return () => { cancelled = true }
  }, [])

  const setKey = useCallback(async (newKey) => {
    const trimmed = (newKey || '').trim()
    lsSet(trimmed)
    setKeyState(trimmed)
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
