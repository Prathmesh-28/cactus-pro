import { useState as _useState, useEffect as _useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut, User, ChevronDown, Shield, Mail, ExternalLink, RefreshCw, Moon, Sun } from 'lucide-react';

function useDarkMode() {
  const [dark, setDark] = _useState(() => document.documentElement.classList.contains('dark') || localStorage.getItem('cactus_dark') === '1');
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('cactus_dark', next ? '1' : '0');
  };
  _useEffect(() => {
    const saved = localStorage.getItem('cactus_dark') === '1';
    document.documentElement.classList.toggle('dark', saved);
    setDark(saved);
  }, []);
  return { dark, toggle };
}
import { getSyncSources, runSync } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import RoleSwitcher from './RoleSwitcher';
import GlobalSearch from '../ui/GlobalSearch';
import MailComposer from '../ui/MailComposer';
import LinkedInComposer from '../ui/LinkedInComposer';
import type { TabName } from '../../data/types';
import { cn } from '../../lib/utils';
import { useState, useRef, useEffect } from 'react';

const NAV_ITEMS: { tab: TabName; label: string; path: string }[] = [
  { tab: 'portfolio',   label: 'Portfolio',   path: '/dashboard'   },
  { tab: 'finance',     label: 'Finance',     path: '/finance'     },
  { tab: 'investment',  label: 'Investment',  path: '/investment'  },
  { tab: 'operations',  label: 'Operations',  path: '/operations'  },
  { tab: 'toolkit',     label: 'VC Toolkit',  path: '/toolkit'     },
  { tab: 'workspace',   label: 'Workspace',   path: '/workspace'   },
  { tab: 'admin',       label: 'Admin',       path: '/admin'       },
];

export default function Header() {
  const { store, currentRole, canAccess } = useApp();
  const { user: authUser, logout } = useAuth();
  const { dark, toggle: toggleDark } = useDarkMode();
  const { firm, announcements, roles } = store;
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showMailComposer, setShowMailComposer] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncDone(false);
    try {
      const sources = await getSyncSources();
      await Promise.all(sources.map(s => runSync(s.id).catch(() => {})));
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } catch {}
    setSyncing(false);
  };
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setBellOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleConfig    = roles.find(r => r.role === currentRole);
  // Super admin always sees ALL tabs regardless of current preview role
  const visibleTabs   = authUser?.role === 'super_admin'
    ? NAV_ITEMS.map(n => n.tab)
    : (roleConfig?.visibleTabs ?? []);
  const activeAnnouncements = announcements.filter(
    a => a.targetRoles.includes(currentRole) && new Date(a.expiryDate) >= new Date()
  );

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  return (
    <>
      {/* ── Main header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#1C4B42', borderBottom: '3px solid #86CA0F' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-8">
          <div className="flex items-center h-16 gap-3">

            {/* Logo + wordmark */}
            <Link to="/" className="flex items-center flex-shrink-0 group">
              {firm.logoUrl ? (
                <img src={firm.logoUrl} alt={firm.name} className="h-8 w-auto object-contain" />
              ) : (
                <img
                  src="/cactus-logo-white.svg"
                  alt="Cactus Partners"
                  className="h-8 w-auto object-contain"
                />
              )}
            </Link>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              {NAV_ITEMS.filter(item => visibleTabs.includes(item.tab)).map(item => {
                const active     = isActive(item.path);
                const accessible = canAccess(item.tab);
                return (
                  <Link
                    key={item.tab}
                    to={item.path}
                    className={cn(
                      'relative px-3.5 py-2 text-sm font-medium rounded-md transition-all duration-150',
                      active ? '' : 'hover:bg-white/10',
                      !accessible && !active && 'opacity-60'
                    )}
                    style={active
                      ? { backgroundColor: '#86CA0F', color: '#1C4B42' }
                      : { color: 'rgba(255,255,255,0.85)' }}
                  >
                    {item.label}
                    {!accessible && <span className="ml-1 text-xs opacity-60">🔒</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-1 xl:gap-2">
              {/* Notification bell */}
              {activeAnnouncements.length > 0 && (
                <div className="relative" ref={bellRef}>
                  <button
                    onClick={() => setBellOpen(o => !o)}
                    className="relative p-2 rounded-lg transition-colors hover:bg-white/10 text-white/70 hover:text-white"
                    title="Announcements"
                  >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#86CA0F' }} />
                  </button>
                  {bellOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border z-50 overflow-hidden"
                      style={{ borderColor: '#E3EDE9' }}>
                      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F2F7F1', backgroundColor: '#F6FAF7' }}>
                        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1C4B42' }}>Announcements</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#E3EDE9', color: '#1C4B42' }}>{activeAnnouncements.length}</span>
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: '#F2F7F1' }}>
                        {activeAnnouncements.map(a => (
                          <div key={a.id} className="px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                a.priority === 'urgent'  ? 'bg-red-100 text-red-700' :
                                a.priority === 'warning' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>{a.priority}</span>
                              <span className="text-xs font-semibold text-gray-900">{a.title}</span>
                            </div>
                            <p className="text-xs text-gray-500">{a.body}</p>
                            <p className="text-[10px] text-gray-300 mt-1">Expires {new Date(a.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Global Search */}
              <GlobalSearch />

              {/* Role switcher — only visible to super_admin */}
              {authUser?.role === 'super_admin' && (
                <div className="hidden sm:flex items-center gap-1 text-xs border rounded-lg px-2 py-1.5"
                  style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                  <span className="text-[11px] mr-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Role</span>
                  <RoleSwitcher />
                </div>
              )}

              {/* Sync All button */}
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60"
                style={syncDone
                  ? { backgroundColor: '#86CA0F', color: '#1C4B42' }
                  : { backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }
                }
                title="Sync all SharePoint sources"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">{syncing ? 'Syncing…' : syncDone ? '✓ Synced' : 'Sync'}</span>
              </button>

              {/* Dark mode toggle */}
              <button onClick={toggleDark}
                className="hidden md:inline-flex p-2 rounded-lg transition-colors hover:bg-white/20 text-white"
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mail compose button */}
              <button
                onClick={() => setShowMailComposer(true)}
                className="hidden md:inline-flex p-2 rounded-lg transition-colors hover:bg-white/20 text-white"
                title="Compose Email"
              >
                <Mail className="w-4 h-4" />
              </button>

              {/* LinkedIn post button */}
              <button
                onClick={() => setShowLinkedIn(true)}
                className="hidden md:inline-flex p-2 rounded-lg transition-colors hover:bg-white/20 text-white"
                title="LinkedIn Post Generator"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 pl-2 rounded-xl py-1 pr-2 transition-colors hover:bg-white/10"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: '#86CA0F', color: '#1C4B42' }}>
                    {(authUser?.name || authUser?.email || roleConfig?.displayName || 'U')[0].toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left max-w-[120px]">
                    <p className="text-xs font-semibold leading-tight text-white truncate">
                      {authUser?.name || roleConfig?.displayName || 'User'}
                    </p>
                    {authUser?.email && (
                      <p className="text-[10px] leading-tight truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        {authUser.email}
                      </p>
                    )}
                  </div>
                  <ChevronDown className={cn('w-3.5 h-3.5 hidden lg:block transition-transform text-white/60', profileOpen && 'rotate-180')} />
                </button>

                {/* Dropdown panel */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border z-50 overflow-hidden"
                    style={{ borderColor: '#E3EDE9' }}>

                    {/* User info */}
                    <div className="px-4 py-4 border-b" style={{ borderColor: '#F2F7F1', backgroundColor: '#F6FAF7' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: '#1C4B42' }}>
                          {(authUser?.name || authUser?.email || 'U')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: '#191c14' }}>
                            {authUser?.name || 'User'}
                          </p>
                          <p className="text-xs truncate" style={{ color: '#555951' }}>
                            {authUser?.email || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#F2F7F1' }}>
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5" style={{ color: '#1C4B42' }} />
                        <span className="text-xs text-gray-500">Role</span>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#E3EDE9', color: '#1C4B42' }}>
                        {authUser?.role === 'super_admin' ? 'Super Admin'
                          : authUser?.role === 'portfolio_team' ? 'Portfolio Team'
                          : authUser?.role === 'finance_team' ? 'Finance Team'
                          : authUser?.role === 'investment_team' ? 'Investment Team'
                          : roleConfig?.displayName ?? authUser?.role ?? 'User'}
                      </span>
                    </div>

                    {/* User ID */}
                    <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#F2F7F1' }}>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400">User ID</span>
                      </div>
                      <span className="text-xs font-mono text-gray-400">#{authUser?.id ?? '—'}</span>
                    </div>

                    {/* Logout */}
                    <button
                      onClick={() => { setProfileOpen(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-white/10"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen
                  ? <X className="w-5 h-5 text-white" />
                  : <Menu className="w-5 h-5 text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t px-5 py-3 flex flex-col gap-1"
            style={{ borderColor: 'rgba(255,255,255,0.15)', backgroundColor: '#154038' }}>
            {NAV_ITEMS.filter(item => visibleTabs.includes(item.tab)).map(item => (
              <Link
                key={item.tab}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive(item.path) ? '' : 'hover:bg-white/10'
                )}
                style={isActive(item.path)
                  ? { backgroundColor: '#86CA0F', color: '#1C4B42' }
                  : { color: 'rgba(255,255,255,0.85)' }}
              >
                {item.label}
              </Link>
            ))}

            {/* Quick actions (moved here from the top bar on mobile) */}
            <div className="mt-2 pt-2 grid grid-cols-2 gap-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
              <button onClick={() => { handleSyncAll(); }} disabled={syncing}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> {syncing ? 'Syncing…' : 'Sync'}
              </button>
              <button onClick={() => { toggleDark(); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
                {dark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />} {dark ? 'Light' : 'Dark'}
              </button>
              <button onClick={() => { setShowMailComposer(true); setMobileOpen(false); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button onClick={() => { setShowLinkedIn(true); setMobileOpen(false); }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#70B5F9' }}>
                <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Announcement banner */}
      {activeAnnouncements.length > 0 && (
        <div
          className="px-5 py-2 text-xs font-medium text-center"
          style={{ backgroundColor: '#E5F7DB', color: '#1C4B42', borderBottom: '1px solid #d2dbd9' }}
        >
          {activeAnnouncements[0].title} — {activeAnnouncements[0].body}
        </div>
      )}

      {/* Modals */}
      <MailComposer
        isOpen={showMailComposer}
        onClose={() => setShowMailComposer(false)}
      />
      <LinkedInComposer
        isOpen={showLinkedIn}
        onClose={() => setShowLinkedIn(false)}
      />
    </>
  );
}
