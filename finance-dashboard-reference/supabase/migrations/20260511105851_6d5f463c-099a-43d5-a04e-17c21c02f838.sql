
-- Drop unused tables from previous iteration
DROP TABLE IF EXISTS public.nav_series CASCADE;
DROP TABLE IF EXISTS public.portfolio_sectors CASCADE;
DROP TABLE IF EXISTS public.investor_requirements CASCADE;
DROP TABLE IF EXISTS public.investors CASCADE;
DROP TABLE IF EXISTS public.balance_settings CASCADE;

-- Fund performance metrics: rows of label/current/expected
CREATE TABLE public.fund_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  current_value numeric,
  expected_value numeric,
  unit text DEFAULT 'number',
  sort_order integer NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Investor requirements matrix
CREATE TABLE public.req_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.req_investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.req_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  row_id uuid NOT NULL REFERENCES public.req_rows(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.req_investors(id) ON DELETE CASCADE,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (row_id, investor_id)
);

-- Pipeline investments
CREATE TABLE public.pipeline_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  stage text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS + open read / editor write on all new tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fund_performance_metrics','req_rows','req_investors','req_cells','pipeline_investments']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "auth read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "editors insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "editors update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (can_edit(auth.uid())) WITH CHECK (can_edit(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "editors delete %1$s" ON public.%1$I FOR DELETE TO authenticated USING (can_edit(auth.uid()))', t);
  END LOOP;
END $$;

-- Seed default performance metric rows
INSERT INTO public.fund_performance_metrics (label, unit, sort_order) VALUES
  ('Investments Made', 'number', 1),
  ('Value of Investments', 'currency', 2),
  ('MOIC', 'multiple', 3),
  ('Gross IRR', 'percent', 4),
  ('Net IRR', 'percent', 5),
  ('Carry', 'percent', 6),
  ('DPI', 'percent', 7),
  ('TVPI', 'multiple', 8),
  ('RVPI', 'multiple', 9),
  ('Hurdle Rate', 'percent', 10);

-- Seed default fund_overview KPI row if empty
INSERT INTO public.fund_overview (fund_name)
SELECT 'Cactus Partners Fund I'
WHERE NOT EXISTS (SELECT 1 FROM public.fund_overview);

-- Seed default expense categories
INSERT INTO public.fund_expenses (category) VALUES
  ('Management Fee'),('Custodian & Trustee'),('Audit'),('Legal & Compliance'),
  ('Tax & Filing'),('Distribution'),('Marketing'),('Other');
INSERT INTO public.im_expenses (category) VALUES
  ('Salaries'),('Office & Admin'),('Travel'),('Technology');
