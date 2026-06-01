import { Link, useLocation } from 'react-router-dom';
import { Leaf, Bell, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import RoleSwitcher from './RoleSwitcher';
import type { TabName } from '../../data/types';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const NAV_ITEMS: { tab: TabName; label: string; path: string }[] = [
  { tab: 'portfolio', label: 'Portfolio', path: '/dashboard' },
  { tab: 'finance', label: 'Finance', path: '/finance' },
  { tab: 'investment', label: 'Investment', path: '/investment' },
  { tab: 'toolkit', label: 'VC Toolkit', path: '/toolkit' },
  { tab: 'workspace', label: 'Workspace', path: '/workspace' },
  { tab: 'admin', label: 'Admin', path: '/admin' },
];

export default function Header() {
  const { store, currentRole, canAccess } = useApp();
  const { firm, announcements, roles } = store;
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleConfig = roles.find((r) => r.role === currentRole);
  const visibleTabs = roleConfig?.visibleTabs ?? [];

  const activeAnnouncements = announcements.filter(
    (a) =>
      a.targetRoles.includes(currentRole) &&
      new Date(a.expiryDate) >= new Date()
  );

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  return (
    <header
      className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm"
      style={{ borderTopColor: firm.primaryColor }}
    >
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo + Name */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            {firm.logoUrl ? (
              <img
                src={firm.logoUrl}
                alt={firm.name}
                className="h-8 w-8 object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: firm.primaryColor }}
              >
                <Leaf className="w-4 h-4 text-white" />
              </div>
            )}
            <span
              className="font-heading font-bold text-lg hidden sm:block"
              style={{ color: firm.primaryColor }}
            >
              {firm.name}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_ITEMS.filter((item) => visibleTabs.includes(item.tab)).map(
              (item) => {
                const accessible = canAccess(item.tab);
                return (
                  <Link
                    key={item.tab}
                    to={item.path}
                    className={cn(
                      'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive(item.path)
                        ? 'text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      !accessible && !isActive(item.path) && 'opacity-70'
                    )}
                    style={
                      isActive(item.path)
                        ? { backgroundColor: firm.primaryColor }
                        : {}
                    }
                  >
                    {item.label}
                    {!accessible && (
                      <span className="ml-1 text-xs opacity-60">🔒</span>
                    )}
                  </Link>
                );
              }
            )}
          </nav>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            {/* Notifications bell */}
            {activeAnnouncements.length > 0 && (
              <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <Bell className="w-4 h-4" />
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: firm.accentColor }}
                />
              </button>
            )}

            {/* Role switcher */}
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="hidden sm:inline">Role:</span>
              <RoleSwitcher />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: firm.accentColor }}
              >
                {roleConfig?.displayName?.[0] ?? 'U'}
              </div>
              <span className="hidden lg:block text-sm text-gray-700 font-medium">
                {roleConfig?.displayName}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400 hidden lg:block" />
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden ml-2 p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <div className="w-5 h-0.5 bg-gray-600 mb-1" />
            <div className="w-5 h-0.5 bg-gray-600 mb-1" />
            <div className="w-5 h-0.5 bg-gray-600" />
          </button>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1">
            {NAV_ITEMS.filter((item) => visibleTabs.includes(item.tab)).map(
              (item) => (
                <Link
                  key={item.tab}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.path)
                      ? 'text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                  style={
                    isActive(item.path)
                      ? { backgroundColor: firm.primaryColor }
                      : {}
                  }
                >
                  {item.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
