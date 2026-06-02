
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_edit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor')
  )
$$;

-- Auto create profile + grant first user admin, others viewer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'viewer';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Domain tables
CREATE TABLE public.fund_overview (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_name TEXT NOT NULL DEFAULT 'Fund III',
  vintage INT,
  fund_size NUMERIC,
  committed_capital NUMERIC,
  called_capital NUMERIC,
  invested_capital NUMERIC,
  nav NUMERIC,
  irr NUMERIC,
  moic NUMERIC,
  dpi NUMERIC,
  tvpi NUMERIC,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.nav_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  nav NUMERIC,
  called_capital NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.portfolio_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector TEXT NOT NULL,
  allocation_pct NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.fund_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  period TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.im_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  period TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  commitment NUMERIC NOT NULL DEFAULT 0,
  called NUMERIC NOT NULL DEFAULT 0,
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.investor_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
  requirement TEXT NOT NULL,
  frequency TEXT,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank TEXT,
  currency TEXT DEFAULT 'USD',
  balance NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.balance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reserved_capital NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- updated_at triggers
CREATE TRIGGER t_fund_overview BEFORE UPDATE ON public.fund_overview FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_nav_series BEFORE UPDATE ON public.nav_series FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_portfolio_sectors BEFORE UPDATE ON public.portfolio_sectors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_fund_expenses BEFORE UPDATE ON public.fund_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_im_expenses BEFORE UPDATE ON public.im_expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_investors BEFORE UPDATE ON public.investors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_investor_requirements BEFORE UPDATE ON public.investor_requirements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_bank_accounts BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_balance_settings BEFORE UPDATE ON public.balance_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.im_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_settings ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "self update profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- user_roles policies
CREATE POLICY "auth read roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generic data policies (read for any authenticated, write for editors+admins)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['fund_overview','nav_series','portfolio_sectors','fund_expenses','im_expenses','investors','investor_requirements','bank_accounts','balance_settings']
  LOOP
    EXECUTE format('CREATE POLICY "auth read %1$I" ON public.%1$I FOR SELECT TO authenticated USING (true);', t);
    EXECUTE format('CREATE POLICY "editors insert %1$I" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "editors update %1$I" ON public.%1$I FOR UPDATE TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));', t);
    EXECUTE format('CREATE POLICY "editors delete %1$I" ON public.%1$I FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));', t);
  END LOOP;
END $$;

-- Seed data
INSERT INTO public.fund_overview (fund_name, vintage, fund_size, committed_capital, called_capital, invested_capital, nav, irr, moic, dpi, tvpi, notes)
VALUES ('Meridian Capital Partners III', 2022, 500000000, 500000000, 312000000, 268000000, 384000000, 0.182, 1.43, 0.21, 1.64, 'Seed data — edit freely.');

INSERT INTO public.nav_series (period, nav, called_capital, sort_order) VALUES
('Q1 2024', 295000000, 220000000, 1),
('Q2 2024', 318000000, 245000000, 2),
('Q3 2024', 342000000, 270000000, 3),
('Q4 2024', 358000000, 285000000, 4),
('Q1 2025', 372000000, 298000000, 5),
('Q2 2025', 384000000, 312000000, 6);

INSERT INTO public.portfolio_sectors (sector, allocation_pct) VALUES
('Software & SaaS', 32),
('Fintech', 22),
('Healthcare', 18),
('Industrial Tech', 14),
('Consumer', 9),
('Other', 5);

INSERT INTO public.fund_expenses (category, budget, actual, period) VALUES
('Management Fees', 10000000, 9750000, 'YTD 2025'),
('Audit & Tax', 250000, 198000, 'YTD 2025'),
('Legal', 400000, 312000, 'YTD 2025'),
('Fund Administration', 180000, 165000, 'YTD 2025'),
('Custody', 90000, 84000, 'YTD 2025'),
('Insurance', 120000, 118000, 'YTD 2025'),
('Bank Charges', 30000, 22000, 'YTD 2025'),
('Other Fund Expenses', 75000, 41000, 'YTD 2025');

INSERT INTO public.im_expenses (category, budget, actual, period) VALUES
('Salaries & Benefits', 4500000, 4180000, 'YTD 2025'),
('Office & Rent', 600000, 575000, 'YTD 2025'),
('Travel & Diligence', 350000, 268000, 'YTD 2025'),
('Technology & Subscriptions', 220000, 195000, 'YTD 2025');

INSERT INTO public.investors (name, type, commitment, called, contact_name, contact_email) VALUES
('State Pension Plan', 'Public Pension', 100000000, 62000000, 'A. Mehta', 'a.mehta@spp.gov'),
('Sovereign Wealth A', 'Sovereign', 75000000, 46500000, 'L. Chen', 'lchen@swa.example'),
('Endowment Foundation', 'Endowment', 50000000, 31000000, 'R. Park', 'rpark@endow.org'),
('Family Office Group', 'Family Office', 40000000, 24800000, 'S. Iyer', 's.iyer@fog.io'),
('Insurance Co.', 'Insurance', 60000000, 37200000, 'M. Olsen', 'm.olsen@insco.com');

INSERT INTO public.investor_requirements (investor_id, requirement, frequency, status)
SELECT id, 'Quarterly capital account statement', 'Quarterly', 'on-track' FROM public.investors;

INSERT INTO public.bank_accounts (name, bank, currency, balance) VALUES
('Operating Account', 'JPMorgan', 'USD', 18400000),
('Capital Call Holding', 'JPMorgan', 'USD', 6200000),
('Distribution Account', 'Citi', 'USD', 2100000);

INSERT INTO public.balance_settings (reserved_capital, notes) VALUES (12000000, 'Reserved for follow-on rounds.');
