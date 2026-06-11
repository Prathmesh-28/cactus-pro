import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Leaf, MapPin, Mail, Phone,
  TrendingUp, Users, Globe, Zap, ChevronLeft, ChevronRight,
  Star, ExternalLink, Building2, Quote, Rocket, Brain,
  Cpu, Car, HeartPulse, Landmark, Shirt, BarChart3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

// ── Animated counter hook ─────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

// ── Intersection observer hook ────────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Stat counter card ──────────────────────────────────────────────────────────
function StatCard({ value, suffix, label, inView }: { value: number; suffix: string; label: string; inView: boolean }) {
  const count = useCountUp(value, 1600, inView);
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-heading font-black text-white mb-1">
        {count}{suffix}
      </div>
      <div className="text-sm text-white/60 font-medium uppercase tracking-widest">{label}</div>
    </div>
  );
}

// ── Sector icon map ─────────────────────────────────────────────────────────────
const SECTOR_ICONS: Record<string, React.ElementType> = {
  's1': Rocket, 's2': Shirt, 's3': Zap, 's4': Cpu,
  's5': Car, 's6': Brain, 's7': Leaf, 's8': Star,
  's9': BarChart3, 's10': HeartPulse, 's11': Landmark,
};

export default function HomePage() {
  const { store } = useApp();
  const { firm, companies, sectors, people, fundMetrics } = store;
  const hp = store.homepage;
  const footerText = firm.footerText;
  const footerDisclaimer = firm.footerDisclaimer;

  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const statsRef = useInView(0.3);
  const portfolioRef = useInView(0.1);
  const teamRef = useInView(0.2);

  // Scroll detection for header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-advance testimonials
  const testimonials = companies.filter(c => c.testimonialQuote);
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  const featured = companies.filter(c => c.isFeatured && c.status !== 'Exited');
  const activeCount = companies.filter(c => c.status === 'Active').length;
  const sectorCount = new Set(companies.map(c => c.sectorId)).size;
  const totalPatents = companies.reduce((s, c) => s + c.patents.length, 0);
  const partners = people.filter(p => p.isPartner);

  const aumMetric = fundMetrics.find(m => m.label === 'Total AUM');
  const moicMetric = fundMetrics.find(m => m.label === 'Avg. MOIC');

  return (
    <div className="min-h-screen bg-[#0A0F0D] text-white font-body overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION
      ═══════════════════════════════════════════════════════════════ */}
      <nav
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0F0D]/95 backdrop-blur-xl border-b border-white/10 shadow-xl shadow-black/20' : 'bg-[#0A2321]/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={firm.logoUrl || '/cactus-logo-white.svg'}
              alt={firm.name}
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-heading font-black text-xl text-white tracking-tight">{firm.name}</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {['Portfolio', 'About', 'Team', 'Sectors'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all">
              Investor Portal
            </Link>
            <a href={`mailto:${firm.email}`}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${firm.primaryColor}, ${firm.accentColor})` }}>
              Connect With Us
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)}>
            <div className={`w-5 h-0.5 bg-white mb-1.5 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <div className={`w-5 h-0.5 bg-white mb-1.5 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <div className={`w-5 h-0.5 bg-white transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#0A0F0D]/98 border-t border-white/10 px-6 py-5 space-y-4">
            {['Portfolio', 'About', 'Team', 'Sectors'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                className="block text-base font-medium text-white/70 hover:text-white py-1">{item}</a>
            ))}
            <Link to="/dashboard" onClick={() => setMenuOpen(false)}
              className="block text-center py-3 rounded-xl border border-white/20 text-white font-semibold mt-2">
              Investor Portal
            </Link>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #1B4332 0%, #0A0F0D 60%)' }} />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(#52B788 1px, transparent 1px), linear-gradient(90deg, #52B788 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        {/* Radial glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${firm.accentColor}, transparent 70%)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-8 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${firm.primaryColor}, transparent 70%)` }} />

        {/* Hero content */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-xs font-semibold tracking-widest uppercase text-white/70 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Venture Capital · India
          </div>

          {/* Headline */}
          <h1 className="font-heading font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight mb-6">
            <span className="block text-white">Capital is just</span>
            <span className="block" style={{
              background: `linear-gradient(135deg, ${firm.accentColor} 0%, #95D5B2 50%, ${firm.primaryColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              the starting point.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed mb-12">
            We partner with bold founders building India's next generation of transformative companies —
            from Series A through growth, and beyond.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#portfolio"
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl shadow-emerald-900/40"
              style={{ background: `linear-gradient(135deg, ${firm.primaryColor}, ${firm.accentColor})` }}>
              View Portfolio
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link to="/dashboard"
              className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold border border-white/15 text-white/80 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:text-white transition-all">
              Open Dashboard
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Scroll indicator */}
          <div className="mt-20 flex flex-col items-center gap-2 opacity-30">
            <span className="text-xs tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-px h-10 bg-white/40" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TICKER — Marquee company names
      ═══════════════════════════════════════════════════════════════ */}
      <div className="border-y border-white/8 bg-white/[0.02] overflow-hidden py-3">
        <div className="flex items-center gap-0 whitespace-nowrap" style={{ animation: 'marquee 30s linear infinite' }}>
          {[...companies, ...companies].map((c, i) => (
            <span key={i} className="flex items-center gap-3 px-6 text-sm font-semibold text-white/30 hover:text-white/60 transition-colors cursor-default">
              <span className="w-1 h-1 rounded-full bg-white/20" />
              {c.name}
            </span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STATS SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 relative" ref={statsRef.ref}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #0A0F0D 0%, #0D1A14 50%, #0A0F0D 100%)' }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
            <StatCard value={activeCount} suffix="+" label="Active Companies" inView={statsRef.inView} />
            <StatCard value={sectorCount} suffix="" label="Sectors" inView={statsRef.inView} />
            <StatCard value={totalPatents} suffix="+" label="Patents Filed" inView={statsRef.inView} />
            <StatCard value={3} suffix="" label="Office Cities" inView={statsRef.inView} />
          </div>

          {/* AUM + MOIC highlight strip */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: aumMetric?.label ?? 'Total AUM', value: aumMetric?.value ?? '₹850 Cr', delta: aumMetric?.delta ?? '+12% YTY', icon: TrendingUp },
              { label: moicMetric?.label ?? 'Avg. MOIC', value: moicMetric?.value ?? '2.7x', delta: moicMetric?.delta ?? '', icon: BarChart3 },
            ].map(item => (
              <div key={item.label} className="relative overflow-hidden rounded-2xl border border-white/10 p-6 group"
                style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.15), rgba(82,183,136,0.05))' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `linear-gradient(135deg, ${firm.primaryColor}20, transparent)` }} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50 mb-1">{item.label}</p>
                    <p className="text-3xl font-heading font-black text-white">{item.value}</p>
                    {item.delta && <p className="text-xs text-emerald-400 mt-1 font-medium">{item.delta}</p>}
                  </div>
                  <item.icon className="w-10 h-10 opacity-20 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ABOUT / PHILOSOPHY SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-28 px-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[500px] h-[500px] rounded-full opacity-6 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${firm.accentColor}, transparent)` }} />
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-6">
                Our Philosophy
              </div>
              <h2 className="font-heading font-black text-4xl md:text-5xl leading-tight text-white mb-6">
                {hp?.philosophyTitle ?? "We don't just write cheques."}
              </h2>
              <p className="text-white/55 text-lg leading-relaxed mb-6">
                {hp?.aboutText ?? 'Cactus Partners is an early and growth-stage venture capital firm headquartered in Mumbai. We invest in exceptional founders building category-defining companies across India\'s most important sectors.'}
              </p>
              <p className="text-white/40 text-base leading-relaxed mb-8">
                {hp?.aboutSubText ?? 'Our value goes beyond capital. We bring deep operational expertise, a curated network, and the candid mentorship that helps founders navigate the full journey — from first product to public markets.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {firm.locations.map(loc => (
                  <div key={loc} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white/60">
                    <MapPin className="w-3.5 h-3.5" style={{ color: firm.accentColor }} />
                    {loc}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: value pillars grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Users, title: 'Founder First', desc: 'We back people before ideas. Trust and transparency are non-negotiable.' },
                { icon: Globe, title: 'India at Core', desc: 'Deep roots in India\'s ecosystem. We move fast and understand local context.' },
                { icon: TrendingUp, title: 'Long-term Capital', desc: 'Patient, aligned capital that stays through the full journey to exit.' },
                { icon: Zap, title: 'Sector Depth', desc: 'Concentrated bets in 9+ sectors where we have proprietary insight.' },
              ].map((pill, i) => (
                <div key={i} className="p-5 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-colors"
                    style={{ backgroundColor: firm.primaryColor + '30' }}>
                    <pill.icon className="w-4.5 h-4.5" style={{ color: firm.accentColor }} />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">{pill.title}</p>
                  <p className="text-white/40 text-xs leading-relaxed">{pill.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          SECTORS STRIP
      ═══════════════════════════════════════════════════════════════ */}
      <section id="sectors" className="py-16 px-6 border-y border-white/8" style={{ background: 'linear-gradient(90deg, #0A0F0D, #0D1A14 50%, #0A0F0D)' }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-semibold tracking-[0.3em] uppercase text-white/30 mb-8">Sectors We Back</p>
          <div className="flex flex-wrap justify-center gap-3">
            {sectors.map(s => {
              const Icon = SECTOR_ICONS[s.id] ?? Zap;
              return (
                <div key={s.id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-default group hover:scale-105"
                  style={{ borderColor: s.color + '30', backgroundColor: s.color + '10' }}>
                  <Icon className="w-3.5 h-3.5 transition-colors" style={{ color: s.color }} />
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PORTFOLIO GRID
      ═══════════════════════════════════════════════════════════════ */}
      <section id="portfolio" className="py-28 px-6 relative" ref={portfolioRef.ref}>
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-5 blur-3xl pointer-events-none"
          style={{ background: `radial-gradient(circle, ${firm.primaryColor}, transparent)` }} />
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Section header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-4">
                Portfolio
              </div>
              <h2 className="font-heading font-black text-4xl md:text-5xl text-white leading-tight">
                Companies we've<br />backed &amp; built.
              </h2>
            </div>
            <Link to="/dashboard"
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/8 transition-all whitespace-nowrap">
              Full Portfolio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Company cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map(c => {
              const sector = store.sectors.find(s => s.id === c.sectorId);
              const Icon = SECTOR_ICONS[c.sectorId] ?? Building2;
              const isHovered = hoveredCompany === c.id;

              return (
                <div
                  key={c.id}
                  onMouseEnter={() => setHoveredCompany(c.id)}
                  onMouseLeave={() => setHoveredCompany(null)}
                  className="group relative overflow-hidden rounded-2xl border cursor-pointer transition-all duration-300"
                  style={{
                    borderColor: isHovered ? (sector?.color ?? '#52B788') + '60' : 'rgba(255,255,255,0.08)',
                    background: isHovered
                      ? `linear-gradient(135deg, ${sector?.color}15 0%, rgba(255,255,255,0.03) 100%)`
                      : 'rgba(255,255,255,0.03)',
                    transform: isHovered ? 'translateY(-3px)' : 'none',
                    boxShadow: isHovered ? `0 20px 40px -12px ${sector?.color}30` : 'none',
                  }}
                >
                  {/* Card content */}
                  <div className="p-6">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center border"
                        style={{ borderColor: sector?.color + '30', backgroundColor: sector?.color + '15' }}>
                        {c.logoUrl
                          ? <img src={c.logoUrl} alt={c.name} className="w-8 h-8 object-contain" />
                          : <Icon className="w-5 h-5" style={{ color: sector?.color }} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold border"
                          style={{ color: sector?.color, borderColor: sector?.color + '40', backgroundColor: sector?.color + '12' }}>
                          {sector?.name}
                        </span>
                      </div>
                    </div>

                    {/* Name + description */}
                    <h3 className="font-heading font-bold text-xl text-white mb-2 group-hover:text-emerald-300 transition-colors">{c.name}</h3>
                    <p className="text-white/45 text-sm leading-relaxed mb-5 line-clamp-2">{c.shortDescription}</p>

                    {/* Metrics row */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[
                        { label: 'MOIC', value: `${c.moic}x` },
                        { label: 'Stage', value: c.stage },
                        { label: 'IRR', value: `${c.irr}%` },
                      ].map(m => (
                        <div key={m.label} className="text-center py-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                          <p className="text-[10px] text-white/35 uppercase tracking-wide">{m.label}</p>
                          <p className="text-sm font-bold text-white mt-0.5">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Footer row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-white/35">
                        <MapPin className="w-3 h-3" />
                        {c.hqCity}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {c.tracxnTag && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: firm.primaryColor + '30', color: firm.accentColor }}>
                            {c.tracxnTag}
                          </span>
                        )}
                        {c.websiteUrl && (
                          <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/10 transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hover accent line */}
                  <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-500 group-hover:w-full w-0"
                    style={{ background: `linear-gradient(90deg, ${sector?.color}, transparent)` }} />
                </div>
              );
            })}
          </div>

          {/* All companies counter strip */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {companies.filter(c => !c.isFeatured || c.status === 'Exited').slice(0, 7).map(c => (
              <span key={c.id} className="text-xs text-white/30 font-medium px-3 py-1.5 rounded-full border border-white/8">
                {c.name}
              </span>
            ))}
            <Link to="/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-full border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors">
              +{companies.length - featured.length} more →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #0A0F0D, #0D1F15 50%, #0A0F0D)' }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-4">
              Founder Stories
            </div>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-white">What founders say.</h2>
          </div>

          {testimonials.length > 0 && (
            <div className="relative">
              {/* Large quote */}
              <div className="text-center px-4">
                <Quote className="w-10 h-10 mx-auto mb-6 opacity-20" style={{ color: firm.accentColor }} />
                <div className="min-h-[120px] flex items-center justify-center">
                  <p className="text-xl md:text-2xl text-white/80 leading-relaxed font-light italic max-w-2xl transition-all duration-500">
                    "{testimonials[testimonialIdx]?.testimonialQuote}"
                  </p>
                </div>
                <div className="mt-8 flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: firm.primaryColor }}>
                    {testimonials[testimonialIdx]?.testimonialAuthorName?.[0]}
                  </div>
                  <p className="font-semibold text-white mt-2">{testimonials[testimonialIdx]?.testimonialAuthorName}</p>
                  <p className="text-sm text-white/40">{testimonials[testimonialIdx]?.testimonialAuthorTitle}</p>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-4 mt-10">
                <button onClick={() => setTestimonialIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                  className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setTestimonialIdx(i)}
                      className="rounded-full transition-all duration-300"
                      style={{
                        width: i === testimonialIdx ? '24px' : '6px',
                        height: '6px',
                        backgroundColor: i === testimonialIdx ? firm.accentColor : 'rgba(255,255,255,0.2)',
                      }} />
                  ))}
                </div>
                <button onClick={() => setTestimonialIdx(i => (i + 1) % testimonials.length)}
                  className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/50 hover:text-white hover:border-white/40 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TEAM SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section id="team" className="py-28 px-6" ref={teamRef.ref}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-4">
              The Team
            </div>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-white">Partners who've<br />been in the arena.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {partners.map((p, i) => (
              <div key={p.id} className="relative group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 transition-all p-7">
                {/* Gradient bg on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${firm.primaryColor}12, transparent)` }} />
                <div className="relative">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white mb-5 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${firm.primaryColor}, ${firm.accentColor})`, opacity: 0.9 + i * 0.03 }}>
                    {p.photoUrl
                      ? <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover rounded-2xl" />
                      : p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <h3 className="font-heading font-bold text-xl text-white mb-1">{p.name}</h3>
                  <p className="text-sm font-semibold mb-4" style={{ color: firm.accentColor }}>{p.title}</p>
                  <p className="text-white/40 text-sm leading-relaxed">{p.bio}</p>
                  {p.email && (
                    <a href={`mailto:${p.email}`}
                      className="inline-flex items-center gap-1.5 mt-5 text-xs text-white/30 hover:text-white/60 transition-colors">
                      <Mail className="w-3 h-3" />
                      {p.email}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-28 px-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[300px] rounded-full blur-3xl opacity-15"
            style={{ background: `radial-gradient(ellipse, ${firm.primaryColor}, transparent 70%)` }} />
        </div>
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <div className="p-12 rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm"
            style={{ boxShadow: `0 0 80px ${firm.primaryColor}20` }}>
            <h2 className="font-heading font-black text-4xl md:text-5xl text-white mb-4 leading-tight">
              Building something<br />
              <span style={{ color: firm.accentColor }}>extraordinary?</span>
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto">
              We meet founders at every stage. If you're solving a real problem in a large market, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={`mailto:${firm.email}`}
                className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white transition-all hover:opacity-90 hover:scale-[1.02] shadow-2xl shadow-emerald-900/40 w-full sm:w-auto justify-center"
                style={{ background: `linear-gradient(135deg, ${firm.primaryColor}, ${firm.accentColor})` }}>
                <Mail className="w-4 h-4" />
                Get In Touch
              </a>
              <Link to="/dashboard"
                className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold border border-white/15 text-white/70 hover:bg-white/8 hover:text-white transition-all w-full sm:w-auto justify-center">
                Investor Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 mt-10">
              <a href={`mailto:${firm.email}`} className="flex items-center gap-2 text-sm text-white/35 hover:text-white/60 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                {firm.email}
              </a>
              <span className="flex items-center gap-2 text-sm text-white/35">
                <Phone className="w-3.5 h-3.5" />
                {firm.phone}
              </span>
              <span className="flex items-center gap-2 text-sm text-white/35">
                <MapPin className="w-3.5 h-3.5" />
                {firm.locations.join(' · ')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/8 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${firm.primaryColor}, ${firm.accentColor})` }}>
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-heading font-black text-white">{firm.name}</p>
                <p className="text-xs text-white/35 italic">{firm.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/30">
              <a href="#portfolio" className="hover:text-white/60 transition-colors">Portfolio</a>
              <a href="#about" className="hover:text-white/60 transition-colors">About</a>
              <a href="#team" className="hover:text-white/60 transition-colors">Team</a>
              <Link to="/dashboard" className="hover:text-white/60 transition-colors">Dashboard</Link>
              <a href={`mailto:${firm.email}`} className="hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-white/6 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/20">{footerText ?? `© ${new Date().getFullYear()} ${firm.name}. All rights reserved.`}</p>
            {footerDisclaimer && <p className="text-xs text-white/10 mt-1">{footerDisclaimer}</p>}
            <p className="text-xs text-white/15">{firm.locations.join(' · ')}</p>
          </div>
        </div>
      </footer>

      {/* Marquee CSS */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
