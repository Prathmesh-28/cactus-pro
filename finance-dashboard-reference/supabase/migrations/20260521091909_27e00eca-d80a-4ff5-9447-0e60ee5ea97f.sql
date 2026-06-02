
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'fund_overview',
    'fund_performance_metrics',
    'fund_expenses',
    'im_expenses',
    'fund_expenses_actual',
    'im_expenses_actual',
    'req_rows',
    'req_investors',
    'req_cells',
    'bank_accounts',
    'pipeline_investments',
    'work_updates'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS fund TEXT NOT NULL DEFAULT ''fund_1''',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (fund)',
      'idx_' || t || '_fund', t
    );
  END LOOP;
END$$;
