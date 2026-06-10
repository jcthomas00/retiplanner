-- Run this in the Supabase SQL editor to enable asset balance history tracking
create table if not exists asset_balance_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  balance numeric not null,
  recorded_at timestamptz not null default now()
);

alter table asset_balance_history enable row level security;

create policy "Users can manage their own asset history"
  on asset_balance_history
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists asset_balance_history_asset_id_idx
  on asset_balance_history(asset_id, recorded_at);
