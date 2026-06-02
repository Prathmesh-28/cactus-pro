ALTER TABLE public.fund_overview
  ADD COLUMN IF NOT EXISTS carry_pct numeric,
  ADD COLUMN IF NOT EXISTS absolute_carry numeric;