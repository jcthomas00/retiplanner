# RetiPlanner

React 18 + Vite retirement-planning dashboard with Supabase auth/persistence and Chart.js visualizations. No CSS framework — styling is a small design system in `src/index.css` plus inline styles in components.

## Design language (follow for ALL UI work)

The app uses a refined, polished aesthetic inspired by Monarch Money / Rocket Money. Any new UI must match it.

**Tokens & shared classes** — defined in `src/index.css`. Always reuse them instead of ad-hoc inline styles:
- Surfaces: `.card` (elevated, 18px radius, `--shadow-card`), `.metric-tile` (+ `.clickable` for hover lift), `.card-title` (11px uppercase, `--text-faint`)
- Buttons: pill-shaped only — `.btn .btn-primary` (filled accent), `.btn .btn-ghost` (outlined), `.btn .btn-subtle` (accent-tinted); icon actions use `.icon-btn` (+ `.danger` for deletes)
- Lists/forms: `.list-row` (hover-highlighted rows), `.chip` (pill tags), `.input` (focus ring via `--accent-light`)
- Colors: always CSS variables (`--text`, `--text-muted`, `--text-faint`, `--accent`, `--positive`, `--warning`, `--negative`, `--card`, `--card-alt`, `--border`, `--border-strong`) so light/dark themes both work

**Principles**
- Soft elevation (layered shadows) over hard borders; generous whitespace; 18px card radius, 12px inner radius, pill (999px) controls
- Typography: DM Sans; big bold numbers (24px/700, `letter-spacing: -0.02em`, `font-variant-numeric: tabular-nums`) over small muted labels — metric-tile hierarchy
- Segmented controls are pill-style with a raised active state (see header nav in `src/pages/Dashboard.jsx`)
- Headers are sticky with frosted-glass backdrop blur
- Subtle motion only: hover lifts, 0.15s transitions, `fadeInUp` on tab change; respect `prefers-reduced-motion`
- Sliders: native `input[type=range]` styled globally (thick track, bordered grabbable thumb); layout = label + value on one line, full-width slider below (never fixed-width side labels — they overflow on mobile)
- Mobile first: no fixed min-widths in flex rows; wrap or stack instead. Breakpoints: 720px (mobile header/nav), 1600px (wide two-column layouts)
- Charts: use the helpers in `src/lib/chartTheme.js` — `verticalGradient` fading area fills, `glassTooltip` (frosted external tooltip, set `tooltip: { enabled: false, external: glassTooltip }`), `crosshairGlow` plugin (dashed crosshair + glowing hover dot), `axisStyle` (clean axes, mono ticks), `centerText` for doughnut center labels. Wrap chart containers in `.chart-glass` (translucent frosted panel)

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (use to verify changes compile)
