ALTER TABLE public.fund_performance_metrics
  ADD COLUMN IF NOT EXISTS investor text NOT NULL DEFAULT 'All';

CREATE INDEX IF NOT EXISTS idx_fund_performance_metrics_investor
  ON public.fund_performance_metrics (investor);