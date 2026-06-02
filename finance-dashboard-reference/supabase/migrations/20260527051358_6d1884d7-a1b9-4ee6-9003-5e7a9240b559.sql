
-- Branding storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Branding public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

CREATE POLICY "Admins upload branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- Branding settings table
CREATE TABLE public.branding (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  logo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.branding TO anon, authenticated;
GRANT INSERT, UPDATE ON public.branding TO authenticated;
GRANT ALL ON public.branding TO service_role;

ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branding readable by all"
ON public.branding FOR SELECT
USING (true);

CREATE POLICY "Admins insert branding"
ON public.branding FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update branding"
ON public.branding FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.branding (id, logo_url) VALUES (true, NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.branding;
