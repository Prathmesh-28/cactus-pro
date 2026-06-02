CREATE TABLE public.section_timestamps (
  section text PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.section_timestamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read section_timestamps" ON public.section_timestamps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "editors insert section_timestamps" ON public.section_timestamps
  FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()));

CREATE POLICY "editors update section_timestamps" ON public.section_timestamps
  FOR UPDATE TO authenticated USING (can_edit(auth.uid())) WITH CHECK (can_edit(auth.uid()));

INSERT INTO public.section_timestamps (section) VALUES
  ('fund_overview'), ('expenses'), ('investors'), ('work_updates')
ON CONFLICT (section) DO NOTHING;

ALTER PUBLICATION supabase_realtime ADD TABLE public.section_timestamps;