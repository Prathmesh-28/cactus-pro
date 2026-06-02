
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.work_update_status AS ENUM ('planned', 'closed', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.work_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text,
  owner text,
  due_date date,
  status public.work_update_status NOT NULL DEFAULT 'planned',
  original_id uuid REFERENCES public.work_updates(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read work_updates" ON public.work_updates;
CREATE POLICY "auth read work_updates" ON public.work_updates
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "editors insert work_updates" ON public.work_updates;
CREATE POLICY "editors insert work_updates" ON public.work_updates
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "editors update work_updates" ON public.work_updates;
CREATE POLICY "editors update work_updates" ON public.work_updates
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

DROP POLICY IF EXISTS "editors delete work_updates" ON public.work_updates;
CREATE POLICY "editors delete work_updates" ON public.work_updates
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

DROP TRIGGER IF EXISTS trg_work_updates_updated_at ON public.work_updates;
CREATE TRIGGER trg_work_updates_updated_at
  BEFORE UPDATE ON public.work_updates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admin-promotion safety net: if no admin exists, promote the earliest profile.
DO $$
DECLARE first_user uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    SELECT id INTO first_user FROM public.profiles ORDER BY created_at ASC LIMIT 1;
    IF first_user IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = first_user;
      INSERT INTO public.user_roles (user_id, role) VALUES (first_user, 'admin');
    END IF;
  END IF;
END $$;
