import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, RotateCcw, Save, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

import type { NavTabConfig } from '../../data/types';

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_TABS: NavTabConfig[] = [
  { key: 'portfolio',  label: 'Portfolio',  customLabel: '', visible: true },
  { key: 'finance',    label: 'Finance',    customLabel: '', visible: true },
  { key: 'investment', label: 'Investment', customLabel: '', visible: true },
  { key: 'operations', label: 'Operations', customLabel: '', visible: true },
  { key: 'toolkit',   label: 'VC Toolkit', customLabel: '', visible: true },
  { key: 'workspace', label: 'Workspace',  customLabel: '', visible: true },
  { key: 'admin',     label: 'Admin',      customLabel: '', visible: true },
];

// ─── Merge helper ─────────────────────────────────────────────────────────────
function mergeTabs(saved: NavTabConfig[] | null): NavTabConfig[] {
  if (!saved) return DEFAULT_TABS.map(t => ({ ...t }));
  return DEFAULT_TABS.map(def => {
    const s = saved.find(p => p.key === def.key);
    return s ? { ...def, ...s } : { ...def };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NavigationManager() {
  const { store, setNavConfig } = useApp();
  const { firm } = store;

  // Load from AppStore (PostgreSQL-synced) — merge with defaults
  const [tabs, setTabs] = useState<NavTabConfig[]>(() => mergeTabs(store.navConfig as NavTabConfig[] | null));
  const [saved, setSaved] = useState(false);

  // Re-sync when store.navConfig changes (another user may have updated it)
  useEffect(() => {
    setTabs(mergeTabs(store.navConfig as NavTabConfig[] | null));
  }, [store.navConfig]);

  // ── Reorder ───────────────────────────────────────────────────────────────
  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setTabs((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setSaved(false);
  }, []);

  const moveDown = useCallback((index: number) => {
    setTabs((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setSaved(false);
  }, []);

  // ── Toggle visibility ─────────────────────────────────────────────────────
  const toggleVisible = useCallback((key: string) => {
    if (key === 'admin') return; // admin tab cannot be hidden
    setTabs((prev) =>
      prev.map((t) => (t.key === key ? { ...t, visible: !t.visible } : t))
    );
    setSaved(false);
  }, []);

  // ── Custom label ──────────────────────────────────────────────────────────
  const setCustomLabel = useCallback((key: string, value: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.key === key ? { ...t, customLabel: value } : t))
    );
    setSaved(false);
  }, []);

  // ── Save to AppContext → PostgreSQL (shared with all users) ──────────────
  const handleSave = () => {
    setNavConfig(tabs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const defaults = DEFAULT_TABS.map((t) => ({ ...t }));
    setTabs(defaults);
    setNavConfig(defaults);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls =
    'flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-30 bg-white placeholder-gray-300';

  return (
    <div className="space-y-4">
      {/* ── Info banner ────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Navigation changes take effect on next page load or tab switch.
        </p>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {tabs.filter((t) => t.visible).length} of {tabs.length} tabs visible
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ backgroundColor: saved ? '#86CA0F' : firm.primaryColor }}
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* ── Tab list ───────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
        {/* Column headers */}
        <div className="grid grid-cols-[2rem_1fr_1fr_5rem_2.5rem] items-center gap-3 px-4 py-2 bg-gray-50">
          <div />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tab</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Custom Label</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Visible</span>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Order</span>
        </div>

        {tabs.map((tab, index) => {
          const isAdmin = tab.key === 'admin';
          const isFirst = index === 0;
          const isLast = index === tabs.length - 1;

          return (
            <div
              key={tab.key}
              className={`grid grid-cols-[2rem_1fr_1fr_5rem_2.5rem] items-center gap-3 px-4 py-3 transition-colors ${
                tab.visible ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {/* Drag handle / index indicator */}
              <span className="text-xs font-mono text-gray-300 text-center select-none">
                {index + 1}
              </span>

              {/* Tab default name */}
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-sm font-medium truncate ${
                    tab.visible ? 'text-gray-800' : 'text-gray-400 line-through'
                  }`}
                >
                  {tab.label}
                </span>
                {isAdmin && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                    locked
                  </span>
                )}
              </div>

              {/* Custom label input */}
              <div>
                <input
                  type="text"
                  className={inputCls}
                  placeholder={tab.label}
                  value={tab.customLabel}
                  onChange={(e) => setCustomLabel(tab.key, e.target.value)}
                  maxLength={32}
                />
              </div>

              {/* Visibility toggle */}
              <div className="flex justify-center">
                <button
                  onClick={() => toggleVisible(tab.key)}
                  disabled={isAdmin}
                  title={
                    isAdmin
                      ? 'Admin tab cannot be hidden'
                      : tab.visible
                      ? 'Click to hide'
                      : 'Click to show'
                  }
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isAdmin
                      ? 'opacity-40 cursor-not-allowed bg-gray-100 text-gray-500'
                      : tab.visible
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {tab.visible ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>On</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Off</span>
                    </>
                  )}
                </button>
              </div>

              {/* Reorder arrows */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => moveUp(index)}
                  disabled={isFirst}
                  title="Move up"
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={isLast}
                  title="Move down"
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
        <p className="text-xs font-semibold text-gray-500">Tips</p>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>
            <span className="font-medium text-gray-600">Custom Label</span> — overrides the display name shown in the top navigation bar.
            Leave blank to use the default name.
          </li>
          <li>
            <span className="font-medium text-gray-600">Visible</span> — hides a tab from the navigation bar without removing
            its data or permissions.
          </li>
          <li>
            <span className="font-medium text-gray-600">Order</span> — use the arrows to reorder tabs. Changes apply after saving.
          </li>
        </ul>
      </div>
    </div>
  );
}
