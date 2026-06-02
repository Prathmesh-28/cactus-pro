import { Link, useLocation } from 'react-router-dom';
import { Bell, Menu, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RoleSwitcher from './RoleSwitcher';
import type { TabName } from '../../data/types';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const NAV_ITEMS: { tab: TabName; label: string; path: string }[] = [
  { tab: 'portfolio',  label: 'Portfolio',   path: '/dashboard' },
  { tab: 'finance',    label: 'Finance',     path: '/finance'   },
  { tab: 'investment', label: 'Investment',  path: '/investment'},
  { tab: 'toolkit',   label: 'VC Toolkit',  path: '/toolkit'   },
  { tab: 'workspace',  label: 'Workspace',   path: '/workspace' },
  { tab: 'admin',      label: 'Admin',       path: '/admin'     },
];

export default function Header() {
  const { store, currentRole, canAccess } = useApp();
  const { firm, announcements, roles } = store;
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #E3EDE9' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-8">
          <div className="flex items-center h-16 gap-6">

            {/* Logo + wordmark */}
            <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
              {firm.logoUrl ? (
                <img src={firm.logoUrl} alt={firm.name} className="h-9 w-auto object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  {/* Cactus leaf icon */}
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="28" height="28" rx="6" fill="#1C4B42"/>
                    <path d="M14 22V10M14 10C14 10 10 8 10 5C10 5 12 7 14 7C16 7 18 5 18 5C18 8 14 10 14 10Z" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 22V16C10 16 7 15 7 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                    <path d="M18 22V16C18 16 21 15 21 12" stroke="#86CA0F" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  <span className="font-heading font-bold text-xl hidden sm:block" style={{ color: '#1C4B42' }}>
                    {firm.name}
                  </span>
                </div>
              )}
            </Link>

            {/* Divider */}
            <div className="hidden md:block h-6 w-px" style={{ backgroundColor: '#E3EDE9' }} />

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
                      active
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                      !accessible && !active && 'opacity-60'
                    )}
                    style={active ? { backgroundColor: '#1C4B42' } : {}}
                  >
                    {item.label}
                    {!accessible && <span className="ml-1 text-xs opacity-60">🔒</span>}
                    {/* Lime underline on hover */}
                    {!active && (
                      <span
                        className="absolute bottom-0 left-3.5 right-3.5 h-0.5 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform origin-left"
                        style={{ backgroundColor: '#86CA0F' }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              {/* Notification bell */}
              {activeAnnouncements.length > 0 && (
                <button className="relative p-2 rounded-lg transition-colors hover:bg-gray-50 text-gray-500">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#86CA0F' }} />
                </button>
              )}

              {/* Role switcher */}
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 border border-gray-100 rounded-lg px-2 py-1.5">
                <span className="text-[11px] text-gray-300 mr-0.5">Role</span>
                <RoleSwitcher />
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-2 pl-2 cursor-pointer">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ backgroundColor: '#1C4B42' }}
                >
                  {roleConfig?.displayName?.[0] ?? 'U'}
                </div>
                <span className="hidden lg:block text-sm font-medium" style={{ color: '#191c14' }}>
                  {roleConfig?.displayName}
                </span>
              </div>

              {/* Mobile hamburger */}
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-50"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="Toggle menu"
              >
                {mobileOpen
                  ? <X className="w-5 h-5 text-gray-600" />
                  : <Menu className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t px-5 py-3 flex flex-col gap-1" style={{ borderColor: '#E3EDE9', backgroundColor: '#F6FAF7' }}>
            {NAV_ITEMS.filter(item => visibleTabs.includes(item.tab)).map(item => (
              <Link
                key={item.tab}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                  isActive(item.path) ? 'text-white' : 'text-gray-700 hover:bg-white'
                )}
                style={isActive(item.path) ? { backgroundColor: '#1C4B42' } : {}}
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
