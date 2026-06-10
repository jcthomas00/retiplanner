// Shared Chart.js theming: gradient area fills, glassmorphic tooltips,
// and a crosshair + glow-dot hover effect used by all charts.

function hexA(hex, a) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(29,158,117,${a})`
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Scriptable background that fades a color vertically to transparent —
// pass to a dataset's backgroundColor with fill: true
export function verticalGradient(hex, top = 0.32, bottom = 0) {
  return (context) => {
    const { ctx, chartArea } = context.chart
    if (!chartArea) return hexA(hex, top)
    const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    g.addColorStop(0, hexA(hex, top))
    g.addColorStop(1, hexA(hex, bottom))
    return g
  }
}

// Dashed vertical crosshair + soft radial glow on the hovered points
export const crosshairGlow = {
  id: 'crosshairGlow',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() || []
    if (!active.length) return
    const { ctx, chartArea } = chart
    const x = active[0].element.x
    ctx.save()
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(128,130,138,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, chartArea.top)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.setLineDash([])
    for (const el of active) {
      const { x: px, y } = el.element
      if (y == null || Number.isNaN(y)) continue
      const color = el.element.options?.borderColor
      const glow = ctx.createRadialGradient(px, y, 0, px, y, 14)
      glow.addColorStop(0, hexA(color, 0.35))
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.beginPath(); ctx.arc(px, y, 14, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = typeof color === 'string' ? color : '#1D9E75'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(px, y, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    }
    ctx.restore()
  },
}

// External tooltip rendered as a floating frosted-glass card (.chart-tooltip in index.css)
export function glassTooltip(context) {
  const { chart, tooltip } = context
  const parent = chart.canvas.parentNode
  let el = parent.querySelector('.chart-tooltip')
  if (!el) {
    el = document.createElement('div')
    el.className = 'chart-tooltip'
    parent.appendChild(el)
  }
  if (tooltip.opacity === 0) { el.style.opacity = 0; return }

  const title = tooltip.title?.join(' ') ?? ''
  const lines = (tooltip.body || []).flatMap(b => b.lines)
  const colors = tooltip.labelColors || []
  el.innerHTML =
    (title ? `<div class="ct-title">${title}</div>` : '') +
    lines.map((l, i) => {
      const c = colors[i]?.borderColor
      const dot = typeof c === 'string' ? `<span class="ct-dot" style="background:${c}"></span>` : ''
      return `<div class="ct-row">${dot}${l}</div>`
    }).join('')

  el.style.opacity = 1
  el.classList.toggle('below', tooltip.caretY < el.offsetHeight + 24)
  const half = el.offsetWidth / 2
  const x = Math.max(half + 4, Math.min(chart.canvas.offsetLeft + tooltip.caretX, chart.width - half - 4))
  el.style.left = x + 'px'
  el.style.top = (chart.canvas.offsetTop + tooltip.caretY - 12) + 'px'
}

// Shared axis styling: clean x, faint y grid, mono currency ticks
export function axisStyle(fmtY) {
  return {
    x: {
      ticks: { maxTicksLimit: 8, font: { size: 11, family: "'DM Sans', sans-serif" }, color: 'rgba(128,130,138,0.9)' },
      grid: { display: false },
      border: { display: false },
    },
    y: {
      ticks: { callback: fmtY, font: { size: 10, family: "'DM Mono', monospace" }, color: 'rgba(128,130,138,0.9)', padding: 6 },
      grid: { color: 'rgba(128,128,128,0.07)' },
      border: { display: false },
    },
  }
}

// Doughnut center label (total + caption)
export const centerText = {
  id: 'centerText',
  afterDraw(chart, _args, opts) {
    if (!opts?.text) return
    const { ctx, chartArea } = chart
    const x = (chartArea.left + chartArea.right) / 2
    const y = (chartArea.top + chartArea.bottom) / 2
    ctx.save()
    ctx.textAlign = 'center'
    ctx.font = "700 20px 'DM Sans', sans-serif"
    ctx.fillStyle = opts.color || '#888'
    ctx.fillText(opts.text, x, y - 1)
    if (opts.sub) {
      ctx.font = "500 11px 'DM Sans', sans-serif"
      ctx.fillStyle = 'rgba(128,130,138,0.9)'
      ctx.fillText(opts.sub, x, y + 17)
    }
    ctx.restore()
  },
}
