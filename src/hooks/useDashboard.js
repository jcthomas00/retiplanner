import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

const DEFAULT_PARAMS = {
  age: 35, retAge: 65, ret: 7, postRet: 4,
  inf: 3, withdraw: 80000, vol: 10, sims: 500
}


export function useDashboard() {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [contributions, setContributions] = useState([])
  const [incomeSources, setIncomeSources] = useState([])
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [assetHistory, setAssetHistory] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [assetsRes, contribsRes, paramsRes, incomeRes, historyRes] = await Promise.all([
        supabase.from('assets').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('contributions').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('projection_params').select('*').eq('user_id', user.id).single(),
        supabase.from('income_sources').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('asset_balance_history').select('asset_id,balance,recorded_at').eq('user_id', user.id).order('recorded_at'),
      ])

      setAssets(assetsRes.data || [])

      // Group history by asset_id
      const hist = {}
      for (const row of historyRes.data || []) {
        if (!hist[row.asset_id]) hist[row.asset_id] = []
        hist[row.asset_id].push({ balance: row.balance, recorded_at: row.recorded_at })
      }
      setAssetHistory(hist)
      setContributions(contribsRes.data || [])

      if (paramsRes.data) {
        const d = paramsRes.data
        setParams({
          age: d.age, retAge: d.ret_age, ret: d.pre_return,
          postRet: d.post_return, inf: d.inflation,
          withdraw: d.annual_withdrawal, vol: d.volatility, sims: 500
        })
      } else {
        await supabase.from('projection_params').insert({
          user_id: user.id, age: 35, ret_age: 65, pre_return: 7,
          post_return: 4, inflation: 3, annual_withdrawal: 80000, volatility: 10
        })
      }

      setIncomeSources(incomeRes.data || [])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const saveParams = useCallback(async (newParams) => {
    setParams(newParams)
    if (!user) return
    await supabase.from('projection_params').upsert({
      user_id: user.id,
      age: newParams.age, ret_age: newParams.retAge,
      pre_return: newParams.ret, post_return: newParams.postRet,
      inflation: newParams.inf, annual_withdrawal: newParams.withdraw,
      volatility: newParams.vol
    }, { onConflict: 'user_id' })
  }, [user])

  const recordBalanceSnapshot = useCallback(async (assetId, balance) => {
    if (!user) return
    const { data } = await supabase.from('asset_balance_history')
      .insert({ asset_id: assetId, user_id: user.id, balance: Number(balance) })
      .select('asset_id,balance,recorded_at').single()
    if (data) {
      setAssetHistory(prev => ({
        ...prev,
        [assetId]: [...(prev[assetId] || []), { balance: data.balance, recorded_at: data.recorded_at }],
      }))
    }
  }, [user])

  const addAsset = useCallback(async (asset) => {
    if (!user) return
    setSaving(true)
    const row = {
      user_id: user.id,
      name: asset.name,
      type: asset.type || 'other',
      balance: Number(asset.balance) || 0,
      color: asset.color || '#1D9E75',
      withdrawal_age: asset.withdrawal_age ?? null,
    }
    const { data, error } = await supabase.from('assets')
      .insert(row).select().single()
    if (error) console.error('addAsset failed:', error.message)
    if (data) {
      setAssets(prev => [...prev, data])
      await recordBalanceSnapshot(data.id, data.balance)
    }
    setSaving(false)
  }, [user, recordBalanceSnapshot])

  const updateAsset = useCallback(async (id, updates) => {
    if (!user) return
    const { data } = await supabase.from('assets')
      .update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (data) {
      setAssets(prev => prev.map(a => a.id === id ? data : a))
      if (updates.balance != null) await recordBalanceSnapshot(id, updates.balance)
    }
  }, [user, recordBalanceSnapshot])

  const deleteAsset = useCallback(async (id) => {
    if (!user) return
    await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id)
    setAssets(prev => prev.filter(a => a.id !== id))
  }, [user])

  const addContribution = useCallback(async (contrib) => {
    if (!user) return
    setSaving(true)
    const row = {
      user_id: user.id,
      name: contrib.name,
      amount: Number(contrib.amount) || 0,
    }
    const { data, error } = await supabase.from('contributions')
      .insert(row).select().single()
    if (error) console.error('addContribution failed:', error.message)
    if (data) setContributions(prev => [...prev, data])
    setSaving(false)
  }, [user])

  const deleteContribution = useCallback(async (id) => {
    if (!user) return
    await supabase.from('contributions').delete().eq('id', id).eq('user_id', user.id)
    setContributions(prev => prev.filter(c => c.id !== id))
  }, [user])

  const addIncomeSource = useCallback(async (source) => {
    if (!user) return
    // Explicitly pick only known schema columns so stray Gemini fields don't cause insert errors
    const row = {
      user_id: user.id,
      name: source.name,
      type: source.type || 'other',
      monthly_amount: Number(source.monthly_amount) || 0,
      base_age: source.base_age ?? null,
      start_age: source.start_age ?? null,
      cola_pct: Number(source.cola_pct) || 0,
      benefit_table: source.benefit_table ?? null,
    }
    const { data, error } = await supabase.from('income_sources')
      .insert(row).select().single()
    if (error) { console.error('addIncomeSource failed:', error.message); return }
    if (data) setIncomeSources(prev => [...prev, data])
  }, [user])

  const updateIncomeSource = useCallback(async (id, updates) => {
    if (!user) return
    const { data } = await supabase.from('income_sources')
      .update(updates).eq('id', id).eq('user_id', user.id).select().single()
    if (data) setIncomeSources(prev => prev.map(s => s.id === id ? data : s))
  }, [user])

  const deleteIncomeSource = useCallback(async (id) => {
    if (!user) return
    await supabase.from('income_sources').delete().eq('id', id).eq('user_id', user.id)
    setIncomeSources(prev => prev.filter(s => s.id !== id))
  }, [user])

  const totalBalance = assets.reduce((s, a) => s + Number(a.balance), 0)
  const totalContrib = contributions.reduce((s, c) => s + Number(c.amount), 0)
  const retirementBalance = assets
    .filter(a => a.type === 'retirement')
    .reduce((s, a) => s + Number(a.balance), 0)
  const investableBalance = assets
    .filter(a => a.type !== 'real_estate')
    .reduce((s, a) => s + Number(a.balance), 0)

  return {
    assets, contributions, incomeSources, params, loading, saving,
    assetHistory,
    totalBalance, totalContrib, retirementBalance, investableBalance,
    saveParams,
    addAsset, updateAsset, deleteAsset,
    addContribution, deleteContribution,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
  }
}
