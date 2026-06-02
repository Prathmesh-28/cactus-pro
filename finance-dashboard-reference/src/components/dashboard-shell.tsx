import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Receipt, CalendarCheck, ChevronDown, Pencil, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { AccountMenu } from "@/components/account-menu";
import { useSectionTimestamp, type SectionKey } from "@/lib/data-hooks";
import { useFund, type FundKey } from "@/lib/fund-context";
import { supabase } from "@/integrations/supabase/client";
import logoMark from "@/assets/logo-mark.png";

const nav = [
  { to: "/", label: "Fund Overview", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: Receipt, children: [
    { to: "/expenses", hash: "projected", label: "Projected Expenses" },
    { to: "/expenses", hash: "actual-budgeted", label: "Actual & Budgeted Expenses" },
    { to: "/expenses", hash: "fund-chart", label: "Fund Chart" },
  ] },
  { to: "/work-updates", label: "Compliances", icon: CalendarCheck },
] as const;

const FIRM_URL = "https://www.cactuspartners.in/";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <a
          href={FIRM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-6 border-b border-sidebar-border hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <img src={logoMark} alt="Cactus Partners" className="size-10 object-contain" />
            <div>
              <div className="font-serif text-lg leading-tight">Cactus Partners</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">Fund Operations ↗</div>
            </div>
          </div>
        </a>
        <SidebarNav pathname={location.pathname} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-64 max-w-[80%] flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border">
              <div className="flex items-center gap-3">
                <img src={logoMark} alt="Cactus Partners" className="size-8 object-contain" />
                <div className="font-serif text-base leading-tight">Cactus Partners</div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1 rounded hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <SidebarNav pathname={location.pathname} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border px-3 md:px-8 py-3" style={{ backgroundColor: "#4a8a18" }}>
          <div className="flex items-center justify-between gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden p-2 -ml-1 rounded hover:bg-white/10 text-white shrink-0"
              aria-label="Open menu"
            >
              <Menu className="size-6" />
            </button>
            <div className="flex-1 flex items-center min-w-0">
              <FundSelector />
            </div>
            <AccountMenu />
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  function scrollToHash(hash: string) {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {nav.map((item) => {
        const active = pathname === item.to;
        const Icon = item.icon;
        const hasChildren = "children" in item && item.children;
        const isOpen = openMenu === item.to;

        if (hasChildren) {
          return (
            <div key={item.to}>
              <button
                type="button"
                onClick={() => setOpenMenu(isOpen ? null : item.to)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn("size-3.5 transition-transform", isOpen && "rotate-180")}
                />
              </button>
              {isOpen && (
                <div className="mt-1 ml-7 space-y-1 border-l border-sidebar-border pl-3">
                  {item.children!.map((child) => (
                    <button
                      key={child.hash}
                      type="button"
                      onClick={async () => {
                        if (pathname !== child.to) {
                          await navigate({ to: child.to });
                          setTimeout(() => scrollToHash(child.hash), 100);
                        } else {
                          scrollToHash(child.hash);
                        }
                      }}
                      className="block w-full text-left px-2 py-1.5 rounded text-xs text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground transition-colors"
                    >
                      {child.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
              active
                ? "bg-sidebar-accent text-accent-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function formatLastUpdated(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${String(d.getFullYear()).slice(-2)} at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function LastUpdated({ section }: { section: SectionKey }) {
  const ts = useSectionTimestamp(section);
  return (
    <p className="mt-1 text-xs italic text-muted-foreground">
      Last updated: {ts ? formatLastUpdated(ts) : "—"}
    </p>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  section,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  section?: SectionKey;
}) {
  return (
    <div className="relative flex md:flex-row md:items-start md:justify-between gap-4 border-b border-border bg-card/50 px-6 md:px-10 py-6">
      <div className="flex flex-col justify-center items-start min-w-0 md:min-h-32 text-left">
        <h1 className="text-2xl md:text-3xl font-serif text-foreground uppercase tracking-wide whitespace-nowrap">{title}</h1>
        {section && <LastUpdated section={section} />}
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        {actions && <div className="mt-3 flex items-center gap-3">{actions}</div>}
      </div>
      <BrandingLogoBox />
    </div>
  );
}

function BrandingLogoBox() {
  const { isAdmin } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("branding").select("logo_url, updated_at").eq("id", true).maybeSingle();
      if (active && data?.logo_url) setLogoUrl(`${data.logo_url}?t=${new Date(data.updated_at).getTime()}`);
    };
    load();
    const channel = supabase
      .channel("branding-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "branding" }, (payload) => {
        const row = payload.new as { logo_url?: string; updated_at?: string } | null;
        if (row?.logo_url) setLogoUrl(`${row.logo_url}?t=${new Date(row.updated_at ?? Date.now()).getTime()}`);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("branding").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("branding").getPublicUrl(path);
      const { error: dbErr } = await supabase
        .from("branding")
        .upsert({ id: true, logo_url: pub.publicUrl, updated_at: new Date().toISOString() });
      if (dbErr) throw dbErr;
      setLogoUrl(`${pub.publicUrl}?t=${Date.now()}`);
    } catch (err) {
      console.error("Logo upload failed", err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div
      className="absolute top-6 z-10 hidden md:block"
      style={{ right: "50px", width: "358px", height: "155px" }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Cactus Partners"
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center" }}
        />
      )}
      {isAdmin && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-1 right-1 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border shadow-sm disabled:opacity-50"
            aria-label="Upload logo"
            title="Upload logo"
          >
            <Pencil className="size-3.5 text-foreground" />
          </button>
        </>
      )}
    </div>
  );
}


function FundSelector() {
  const { fund, setFund } = useFund();
  const options: { value: FundKey; label: string }[] = [
    { value: "fund_1", label: "Fund 1" },
    { value: "fund_2", label: "Fund 2" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Active fund"
      className="inline-flex items-center rounded-md border border-white/20 bg-transparent p-0.5"
    >
      {options.map((opt) => {
        const active = fund === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setFund(opt.value)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-[4px] transition-colors",
            )}
            style={
              active
                ? { backgroundColor: "#ffffff", color: "#3B6D11" }
                : { backgroundColor: "transparent", color: "#d4edaa" }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
