import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut, User, ChevronDown, Shield } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import RoleSwitcher from './RoleSwitcher';
import GlobalSearch from '../ui/GlobalSearch';
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
  const { firm, announcements, roles } = store;
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const roleConfig    = roles.find(r => r.role === currentRole);
  const visibleTabs   = roleConfig?.visibleTabs ?? [];
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
          <div className="flex items-center h-16 gap-6">

            {/* Logo + wordmark */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
              {firm.logoUrl ? (
                <img src={firm.logoUrl} alt={firm.name} className="h-9 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="28" height="28" rx="6" fill="rgba(255,255,255,0.15)"/>
                    <path d="M14 22V10M14 10C14 10 10 8 10 5C10 5 12 7 14 7C16 7 18 5 18 5C18 8 14 10 14 10Z" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 22V16C10 16 7 15 7 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M18 22V16C18 16 21 15 21 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span className="font-heading font-bold text-xl hidden sm:block text-white">
                    {firm.name}
                  </span>
                </div>
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
            <div className="ml-auto flex items-center gap-2">
              {/* Notification bell */}
              {activeAnnouncements.length > 0 && (
                <button className="relative p-2 rounded-lg transition-colors hover:bg-white/10 text-white/70 hover:text-white">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#86CA0F' }} />
                </button>
              )}

              {/* Global Search */}
              <GlobalSearch />

              {/* Role switcher */}
              <div className="hidden sm:flex items-center gap-1 text-xs border rounded-lg px-2 py-1.5"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                <span className="text-[11px] mr-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>Role</span>
                <RoleSwitcher />
              </div>

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
                  <div className="hidden lg:block text-left">
                    <p className="text-xs font-semibold leading-tight text-white">
                      {authUser?.name || roleConfig?.displayName || 'User'}
                    </p>
                    {authUser?.email && (
                      <p className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>
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
    </>
  );
}
