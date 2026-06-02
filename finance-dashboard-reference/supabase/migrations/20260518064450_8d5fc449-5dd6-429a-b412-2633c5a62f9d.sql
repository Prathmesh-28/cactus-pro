
-- Align actual tables to exact column set: id, category, budgeted, q1, var_q1, q2, var_q2, q3, var_q3, q4, var_q4
-- Keep updated_at / updated_by metadata (needed by data hooks).

ALTER TABLE public.fund_expenses_actual RENAME COLUMN budget TO budgeted;
ALTER TABLE public.im_expenses_actual RENAME COLUMN budget TO budgeted;

ALTER TABLE public.fund_expenses_actual
  DROP COLUMN IF EXISTS actual,
  DROP COLUMN IF EXISTS period,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS fy23,
  DROP COLUMN IF EXISTS fy24,
  DROP COLUMN IF EXISTS fy25,
  DROP COLUMN IF EXISTS fy26,
  DROP COLUMN IF EXISTS fy27,
  DROP COLUMN IF EXISTS fy28,
  DROP COLUMN IF EXISTS fy29,
  DROP COLUMN IF EXISTS fy30,
  DROP COLUMN IF EXISTS fy31,
  ADD COLUMN var_q1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q3 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q4 numeric NOT NULL DEFAULT 0;

ALTER TABLE public.im_expenses_actual
  DROP COLUMN IF EXISTS actual,
  DROP COLUMN IF EXISTS period,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS fy23,
  DROP COLUMN IF EXISTS fy24,
  DROP COLUMN IF EXISTS fy25,
  DROP COLUMN IF EXISTS fy26,
  DROP COLUMN IF EXISTS fy27,
  DROP COLUMN IF EXISTS fy28,
  DROP COLUMN IF EXISTS fy29,
  DROP COLUMN IF EXISTS fy30,
  DROP COLUMN IF EXISTS fy31,
  ADD COLUMN var_q1 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q2 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q3 numeric NOT NULL DEFAULT 0,
  ADD COLUMN var_q4 numeric NOT NULL DEFAULT 0;
