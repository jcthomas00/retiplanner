# Retirement Dashboard

A full-stack React + Supabase app for tracking assets and projecting retirement savings with Monte Carlo simulations.

## Features
- **Auth** — email/password sign in via Supabase Auth
- **Assets** — track retirement accounts, brokerage, real estate, and cash
- **Contributions** — annual contribution tracking per account
- **Projection** — interactive sliders for age, returns, inflation, withdrawal rate
- **Monte Carlo** — run up to 2,000 simulations to see outcome distribution and success rate
- **Persistence** — all data saved per user in Supabase Postgres with Row Level Security

---

## Setup (5 steps)

### 1. Clone and install dependencies
```bash
git clone <your-repo>
cd retirement-dashboard
npm install
```

### 2. Create a Supabase project
1. Go to https://supabase.com and create a free account
2. Create a new project (pick any region)
3. Wait ~2 minutes for it to provision

### 3. Run the database schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** — this creates the tables and sets up Row Level Security

### 4. Set up environment variables
```bash
cp .env.example .env.local
```

Then open `.env.local` and fill in:
- `VITE_SUPABASE_URL` — from Supabase dashboard → Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — from Supabase dashboard → Settings → API → anon/public key

> **Gemini API key:** No longer needed in `.env.local`. Users enter their own key directly in the app (AI Chat and PDF Import tabs). It's stored only in the browser's `localStorage` and never in the bundle.

### 5. Start the dev server
```bash
npm run dev
```

Open http://localhost:5173 — create an account and you're in.

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

When prompted, add your environment variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Or set them in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Project structure

```
src/
  lib/
    supabase.js       # Supabase client init
    finance.js        # Calculation utilities (projections, Monte Carlo)
  hooks/
    useAuth.js        # Auth context + provider
    useDashboard.js   # All data loading/saving to Supabase
  components/
    Overview.jsx      # Net worth summary + charts
    Assets.jsx        # Asset & contribution management
    Projection.jsx    # Slider-driven retirement projection
    Simulation.jsx    # Monte Carlo simulation engine
  pages/
    AuthPage.jsx      # Login / signup
    Dashboard.jsx     # Main layout + tab routing
  App.js              # Root with routing
  index.css           # Global styles + design tokens
supabase-schema.sql   # DB schema — run this once in Supabase SQL editor
```

---

## Extending the app

**Add Plaid integration** (live bank/brokerage balances):
- Sign up at https://plaid.com/docs/quickstart/
- You'll need a backend (Vercel serverless functions work well) to securely call the Plaid API

**Add more asset types:**
- Extend the `ASSET_TYPES` array in `src/lib/finance.js`
- Update the DB constraint in `supabase-schema.sql`

**Add tax-aware projections:**
- Differentiate traditional 401k (pre-tax) vs Roth (post-tax) in withdrawal calculations
- Apply `(1 - taxRate)` to traditional withdrawals

**Add email reminders:**
- Use Supabase Edge Functions + pg_cron to send monthly portfolio update emails
