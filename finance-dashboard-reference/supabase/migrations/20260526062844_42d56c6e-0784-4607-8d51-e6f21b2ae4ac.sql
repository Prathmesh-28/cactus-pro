-- Restrict profiles SELECT to self, admins, and editors
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;

CREATE POLICY "self or staff read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'editor'::public.app_role)
);

-- Restrict user_roles SELECT to self and admins
DROP POLICY IF EXISTS "auth read roles" ON public.user_roles;

CREATE POLICY "self or admin read roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
