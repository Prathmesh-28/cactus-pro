ALTER TABLE public.section_timestamps ADD COLUMN IF NOT EXISTS fund text NOT NULL DEFAULT 'fund_1';
ALTER TABLE public.section_timestamps DROP CONSTRAINT IF EXISTS section_timestamps_pkey;
ALTER TABLE public.section_timestamps ADD CONSTRAINT section_timestamps_pkey PRIMARY KEY (section, fund);