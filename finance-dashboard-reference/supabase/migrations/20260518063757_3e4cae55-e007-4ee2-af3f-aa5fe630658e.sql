CREATE TABLE public.fund_expenses_actual (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  budget numeric NOT NULL DEFAULT 0,
  actual numeric NOT NULL DEFAULT 0,
  q1 numeric NOT NULL DEFAULT 0,
  q2 numeric NOT NULL DEFAULT 0,
  q3 numeric NOT NULL DEFAULT 0,
  q4 numeric NOT NULL DEFAULT 0,
  fy23 numeric NOT NULL DEFAULT 0,
  fy24 numeric NOT NULL DEFAULT 0,
  fy25 numeric NOT NULL DEFAULT 0,
  fy26 numeric NOT NULL DEFAULT 0,
  fy27 numeric NOT NULL DEFAULT 0,
  fy28 numeric NOT NULL DEFAULT 0,
  fy29 numeric NOT NULL DEFAULT 0,
  fy30 numeric NOT NULL DEFAULT 0,
  fy31 numeric NOT NULL DEFAULT 0,
  period text,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.im_expenses_actual (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  budget numeric NOT NULL DEFAULT 0,
  actual numeric NOT NULL DEFAULT 0,
  q1 numeric NOT NULL DEFAULT 0,
  q2 numeric NOT NULL DEFAULT 0,
  q3 numeric NOT NULL DEFAULT 0,
  q4 numeric NOT NULL DEFAULT 0,
  fy23 numeric NOT NULL DEFAULT 0,
  fy24 numeric NOT NULL DEFAULT 0,
  fy25 numeric NOT NULL DEFAULT 0,
  fy26 numeric NOT NULL DEFAULT 0,
  fy27 numeric NOT NULL DEFAULT 0,
  fy28 numeric NOT NULL DEFAULT 0,
  fy29 numeric NOT NULL DEFAULT 0,
  fy30 numeric NOT NULL DEFAULT 0,
  fy31 numeric NOT NULL DEFAULT 0,
  period text,
  notes text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.fund_expenses_actual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.im_expenses_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read fund_expenses_actual" ON public.fund_expenses_actual FOR SELECT TO authenticated USING (true);
CREATE POLICY "editors insert fund_expenses_actual" ON public.fund_expenses_actual FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "editors update fund_expenses_actual" ON public.fund_expenses_actual FOR UPDATE TO authenticated USING (can_edit(auth.uid())) WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "editors delete fund_expenses_actual" ON public.fund_expenses_actual FOR DELETE TO authenticated USING (can_edit(auth.uid()));

CREATE POLICY "auth read im_expenses_actual" ON public.im_expenses_actual FOR SELECT TO authenticated USING (true);
CREATE POLICY "editors insert im_expenses_actual" ON public.im_expenses_actual FOR INSERT TO authenticated WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "editors update im_expenses_actual" ON public.im_expenses_actual FOR UPDATE TO authenticated USING (can_edit(auth.uid())) WITH CHECK (can_edit(auth.uid()));
CREATE POLICY "editors delete im_expenses_actual" ON public.im_expenses_actual FOR DELETE TO authenticated USING (can_edit(auth.uid()));