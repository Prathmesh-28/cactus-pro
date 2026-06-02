ALTER TABLE public.fund_overview 
ADD COLUMN IF NOT EXISTS bank_balance numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS pipeline_total numeric NOT NULL DEFAULT 0;