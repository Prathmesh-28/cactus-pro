CREATE TABLE public.fund_metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fund text NOT NULL DEFAULT 'fund_1',
  row_type text NOT NULL,
  period text NOT NULL DEFAULT 'Current',
  metric_key text NOT NULL,
  value numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (fund, row_type, period, metric_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_metric_values TO authenticated;
GRANT ALL ON public.fund_metric_values TO service_role;

ALTER TABLE public.fund_metric_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read fund_metric_values" ON public.fund_metric_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "editors insert fund_metric_values" ON public.fund_metric_values
  FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "editors update fund_metric_values" ON public.fund_metric_values
  FOR UPDATE TO authenticated USING (can_edit(auth.uid())) WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "editors delete fund_metric_values" ON public.fund_metric_values
  FOR DELETE TO authenticated USING (can_edit(auth.uid()));

CREATE TRIGGER fund_metric_values_updated_at
  BEFORE UPDATE ON public.fund_metric_values
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();