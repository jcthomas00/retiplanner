export const fmt = (v) => '$' + Math.round(v).toLocaleString()

export const fmtK = (v) => {
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  return '$' + Math.round(v / 1000) + 'K'
}

export const ASSET_COLORS = [
  '#1D9E75', '#378ADD', '#7F77DD', '#D4537E',
  '#BA7517', '#639922', '#888780', '#5DCAA5'
]

export const ASSET_TYPES = [
  { value: 'retirement', label: 'Retirement' },
  { value: 'taxable', label: 'Taxable brokerage' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'cash', label: 'Cash / savings' },
  { value: 'other', label: 'Other' },
]

export const INCOME_TYPES = [
  { value: 'social_security', label: 'Social Security' },
  { value: 'pension', label: 'Pension' },
  { value: 'annuity', label: 'Annuity' },
  { value: 'other', label: 'Other income' },
]

// ── Social Security ──────────────────────────────────────────────────────────

const SS_FRA = 67

// Multiplier applied to PIA at a given claiming age
export function ssClaimingFactor(age) {
  const a = Math.min(70, Math.max(62, age))
  if (a >= SS_FRA) return 1 + 0.08 * (a - SS_FRA)           // +8%/yr after FRA, capped at 70
  const moBefore = (SS_FRA - a) * 12
  // First 36 months: 5/9 of 1% per month; beyond: 5/12 of 1% per month
  const reduction = moBefore <= 36
    ? moBefore * (5 / 9 / 100)
    : 36 * (5 / 9 / 100) + (moBefore - 36) * (5 / 12 / 100)
  return Math.max(0, 1 - reduction)
}

// Given a benefit quoted at baseAge, return the monthly benefit at startAge
export function ssAdjustedMonthly(monthlyAtBase, baseAge, startAge) {
  const pia = monthlyAtBase / ssClaimingFactor(baseAge)
  return pia * ssClaimingFactor(startAge)
}

// Look up (or interpolate) a personalized benefit table {age: amount, ...}
// extracted directly from an SSA statement. Returns null if no usable table.
export function benefitFromTable(table, age) {
  if (!table) return null
  const entries = Object.entries(table)
    .map(([a, v]) => [Number(a), Number(v)])
    .filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v))
    .sort((a, b) => a[0] - b[0])
  if (entries.length === 0) return null

  const a = Math.min(entries[entries.length - 1][0], Math.max(entries[0][0], age))

  // Exact match
  const exact = entries.find(([ea]) => ea === a)
  if (exact) return exact[1]

  // Interpolate between surrounding known ages
  let lo = entries[0], hi = entries[entries.length - 1]
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i][0] <= a && a <= entries[i + 1][0]) {
      lo = entries[i]; hi = entries[i + 1]; break
    }
  }
  if (lo[0] === hi[0]) return lo[1]
  const frac = (a - lo[0]) / (hi[0] - lo[0])
  return lo[1] + frac * (hi[1] - lo[1])
}

// ── Income sources ───────────────────────────────────────────────────────────

// Actual monthly benefit a source pays (accounting for SS adjustments)
export function effectiveMonthly(source) {
  // Prefer a personalized per-age benefit table extracted directly from a
  // statement (SSA statement, pension annual statement, etc.) — it reflects
  // the provider's actual estimate at each claiming/retirement age, which is
  // more accurate than a generic formula derived from one data point.
  const fromTable = benefitFromTable(source.benefit_table, source.start_age)
  if (fromTable != null) return fromTable

  if (source.type === 'social_security') {
    return ssAdjustedMonthly(source.monthly_amount, source.base_age, source.start_age)
  }
  return source.monthly_amount
}

// Annual income from a source at a given age (0 if not yet started)
export function annualIncomeAtAge(source, age) {
  if (age < source.start_age) return 0
  const monthly = effectiveMonthly(source)
  const cola = Math.pow(1 + (source.cola_pct || 0) / 100, age - source.start_age)
  return monthly * 12 * cola
}

// Total annual income from all sources at a given age
export function totalIncomeAtAge(sources, age) {
  return (sources || []).reduce((s, src) => s + annualIncomeAtAge(src, age), 0)
}

// ── Projection helpers ────────────────────────────────────────────────────────

export function projectValue(years, start, contrib, rate) {
  let v = start
  for (let i = 0; i < years; i++) v = v * (1 + rate) + contrib
  return v
}

// Build the full year-by-year projection, returning an array of data points.
// Handles per-asset withdrawal ages and income sources.
export function buildProjection(params, assets, totalContrib, incomeSources) {
  const { age, retAge, ret, postRet, inf, withdraw } = params
  const preRate = ret / 100
  const postRate = postRet / 100
  const infRate = inf / 100

  // Split investable assets into liquid (can withdraw at ret) vs locked (withdrawal_age > retAge)
  const investable = assets.filter(a => a.type !== 'real_estate')
  const liquid = investable.filter(a => !a.withdrawal_age || a.withdrawal_age <= retAge)
  const locked = investable.filter(a => a.withdrawal_age && a.withdrawal_age > retAge)
  const totalInvestable = investable.reduce((s, a) => s + Number(a.balance), 0)

  const liquidRatio = totalInvestable > 0
    ? liquid.reduce((s, a) => s + Number(a.balance), 0) / totalInvestable
    : 1

  // Locked groups: [{withdrawal_age, balanceRatio}]
  const lockedGroups = {}
  for (const a of locked) {
    const wa = a.withdrawal_age
    lockedGroups[wa] = (lockedGroups[wa] || 0) + Number(a.balance) / totalInvestable
  }

  const yearsToRet = retAge - age
  const totalYears = yearsToRet + 35
  const points = []

  // Accumulation phase — grow everything together
  let portfolio = totalInvestable > 0 ? totalInvestable : 0
  for (let i = 0; i <= yearsToRet; i++) {
    points.push({ age: age + i, portfolio: Math.round(portfolio), phase: 'accumulation', income: 0, netWithdraw: 0 })
    if (i < yearsToRet) portfolio = portfolio * (1 + preRate) + totalContrib
  }

  // At retirement: split into liquid and locked pools
  const retPortfolio = portfolio
  let liquidPool = retPortfolio * liquidRatio
  const lockedPools = {}
  for (const [wa, ratio] of Object.entries(lockedGroups)) {
    lockedPools[wa] = retPortfolio * ratio
  }

  // Inflation-adjust withdrawal each year
  let inflAdjWithdraw = withdraw

  // Distribution phase
  for (let i = 1; i <= totalYears - yearsToRet; i++) {
    const currentAge = retAge + i
    inflAdjWithdraw *= (1 + infRate)

    // Grow locked pools; unlock if it's time
    for (const wa of Object.keys(lockedPools)) {
      lockedPools[wa] = lockedPools[wa] * (1 + postRate)
      if (parseInt(wa) <= currentAge) {
        liquidPool += lockedPools[wa]
        delete lockedPools[wa]
      }
    }

    // Income sources reduce the withdrawal needed from portfolio
    const income = totalIncomeAtAge(incomeSources || [], currentAge)
    const netWithdraw = Math.max(0, inflAdjWithdraw - income)

    liquidPool = Math.max(0, liquidPool * (1 + postRate) - netWithdraw)
    const totalPool = liquidPool + Object.values(lockedPools).reduce((s, v) => s + v, 0)

    points.push({
      age: currentAge,
      portfolio: Math.round(Math.max(0, totalPool)),
      phase: 'distribution',
      income: Math.round(income),
      netWithdraw: Math.round(netWithdraw),
      grossWithdraw: Math.round(inflAdjWithdraw),
    })

    if (liquidPool <= 0 && Object.keys(lockedPools).length === 0) {
      // Depleted — fill remaining years with zeros
      for (let j = i + 1; j <= totalYears - yearsToRet; j++) {
        const a = retAge + j
        const inc = totalIncomeAtAge(incomeSources || [], a)
        points.push({ age: a, portfolio: 0, phase: 'distribution', income: Math.round(inc), netWithdraw: 0, grossWithdraw: Math.round(inflAdjWithdraw) })
      }
      break
    }
  }

  return points
}

export function calcDepletionAge(points) {
  const depleted = points.find(p => p.phase === 'distribution' && p.portfolio === 0)
  return depleted ? depleted.age : 120
}

// ── Monte Carlo ───────────────────────────────────────────────────────────────

export function randn() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function runMonteCarlo(params, assets, totalContrib, incomeSources, numSims) {
  const { age, retAge, ret: preReturn, postRet: postReturn, inf, vol, withdraw } = params
  const yearsToRet = retAge - age
  const totalYears = yearsToRet + 30

  const investable = assets.filter(a => a.type !== 'real_estate')
  const startBalance = investable.reduce((s, a) => s + Number(a.balance), 0)
  const totalInvestable = startBalance
  const liquidRatio = totalInvestable > 0
    ? investable.filter(a => !a.withdrawal_age || a.withdrawal_age <= retAge)
        .reduce((s, a) => s + Number(a.balance), 0) / totalInvestable
    : 1
  const lockedGroupsBase = {}
  for (const a of investable.filter(a => a.withdrawal_age && a.withdrawal_age > retAge)) {
    const wa = a.withdrawal_age
    lockedGroupsBase[wa] = (lockedGroupsBase[wa] || 0) + Number(a.balance) / totalInvestable
  }

  const allPaths = []

  for (let s = 0; s < numSims; s++) {
    let v = startBalance
    const path = [v]

    // Accumulation
    for (let y = 0; y < yearsToRet; y++) {
      const r = (preReturn / 100) + randn() * (vol / 100)
      v = v * (1 + r) + totalContrib
      v = Math.max(0, v)
    }

    // Split at retirement
    let liquid = v * liquidRatio
    const lockedPools = {}
    for (const [wa, ratio] of Object.entries(lockedGroupsBase)) {
      lockedPools[wa] = v * ratio
    }
    path.push(Math.round(v))

    let inflAdjWithdraw = withdraw

    // Distribution
    for (let y = 0; y < totalYears - yearsToRet; y++) {
      const currentAge = retAge + y + 1
      inflAdjWithdraw *= (1 + inf / 100)

      const r = (postReturn / 100) + randn() * (vol / 100)

      for (const wa of Object.keys(lockedPools)) {
        lockedPools[wa] = lockedPools[wa] * (1 + r)
        if (parseInt(wa) <= currentAge) {
          liquid += lockedPools[wa]
          delete lockedPools[wa]
        }
      }

      const income = totalIncomeAtAge(incomeSources || [], currentAge)
      const netWithdraw = Math.max(0, inflAdjWithdraw - income)
      liquid = Math.max(0, liquid * (1 + r) - netWithdraw)

      const total = Math.max(0, liquid) + Object.values(lockedPools).reduce((s, vv) => s + vv, 0)
      path.push(Math.round(total))
      if (liquid <= 0 && Object.keys(lockedPools).length === 0) {
        while (path.length <= totalYears) path.push(0)
        break
      }
    }
    while (path.length <= totalYears) path.push(0)
    allPaths.push(path)
  }

  const labels = Array.from({ length: totalYears + 1 }, (_, i) => age + i)
  const percentiles = [10, 25, 50, 75, 90]
  const bands = percentiles.map(pct =>
    Array.from({ length: totalYears + 1 }, (_, i) => {
      const vals = allPaths.map(p => p[i]).sort((a, b) => a - b)
      return Math.round(vals[Math.floor(vals.length * pct / 100)])
    })
  )

  const survived = allPaths.filter(p => p[p.length - 1] > 0).length
  const finalVals = allPaths.map(p => p[p.length - 1])

  return { labels, bands, allPaths, survived, finalVals, totalYears, startBalance }
}
