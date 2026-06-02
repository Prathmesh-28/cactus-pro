
CREATE TABLE public.dynamic_tables (
  table_key text PRIMARY KEY,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dynamic_tables TO authenticated;
GRANT ALL ON public.dynamic_tables TO service_role;

ALTER TABLE public.dynamic_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read dynamic_tables"
  ON public.dynamic_tables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "editors insert dynamic_tables"
  ON public.dynamic_tables FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "editors update dynamic_tables"
  ON public.dynamic_tables FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()))
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "editors delete dynamic_tables"
  ON public.dynamic_tables FOR DELETE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE TRIGGER set_dynamic_tables_updated_at
  BEFORE UPDATE ON public.dynamic_tables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
