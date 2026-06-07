-- RetiPlanner — run this in your Supabase SQL editor:
-- https://supabase.com/dashboard → your project → SQL Editor
-- Users can only see and modify their own data (Row Level Security enforced on all tables)

-- ── Upgrade migrations (run these if you have an existing schema) ─────────────
-- ALTER TABLE assets ADD COLUMN IF NOT EXISTS withdrawal_age INTEGER;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gemini_key TEXT;
-- ALTER TABLE income_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE income_sources ALTER COLUMN base_age DROP NOT NULL;
-- ALTER TABLE income_sources ALTER COLUMN start_age DROP NOT NULL;
-- ALTER TABLE income_sources ALTER COLUMN base_age DROP DEFAULT;
-- ALTER TABLE income_sources ALTER COLUMN start_age DROP DEFAULT;
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  gemini_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('retirement','taxable','real_estate','cash','other')),
  balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#1D9E75',
  withdrawal_age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('social_security','pension','annuity','other')),
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  base_age INTEGER,
  start_age INTEGER,
  cola_pct NUMERIC NOT NULL DEFAULT 0,
  benefit_table JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projection_params (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  age INTEGER NOT NULL DEFAULT 35,
  ret_age INTEGER NOT NULL DEFAULT 65,
  pre_return NUMERIC NOT NULL DEFAULT 7,
  post_return NUMERIC NOT NULL DEFAULT 4,
  inflation NUMERIC NOT NULL DEFAULT 3,
  annual_withdrawal NUMERIC NOT NULL DEFAULT 80000,
  volatility NUMERIC NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE projection_params ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users manage own assets" ON assets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own contributions" ON contributions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own income sources" ON income_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own params" ON projection_params
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER income_sources_updated_at
  BEFORE UPDATE ON income_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER params_updated_at
  BEFORE UPDATE ON projection_params FOR EACH ROW EXECUTE FUNCTION update_updated_at();
