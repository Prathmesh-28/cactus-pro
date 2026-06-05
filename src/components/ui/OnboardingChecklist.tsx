/**
 * First-time onboarding checklist — shown on the Portfolio Companies tab until all steps are done.
 * Tracks progress in localStorage (user-specific — each user dismisses for themselves).
 */
import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const KEY = 'cactus_onboarding_dismissed';

interface Step {
  id: string;
  label: string;
  hint: string;
  done: (store: ReturnType<typeof useApp>['store']) => boolean;
}

const STEPS: Step[] = [
  {
    id: 'companies',
    label: 'Add your portfolio companies',
    hint: 'Admin → Companies → Add Company',
    done: s => (s.companies?.length ?? 0) > 0,
  },
  {
    id: 'snapshot',
    label: 'Upload Portfolio Snapshot',
    hint: 'Finance → Fund Overview → Upload Excel/CSV',
    done: s => (s.portfolioSnapshot?.length ?? 0) > 0,
  },
  {
    id: 'firm',
    label: 'Set your firm name and logo',
    hint: 'Admin → Firm Settings',
    done: s => !!(s.firm?.name && s.firm?.logoUrl),
  },
  {
    id: 'users',
    label: 'Invite your team',
    hint: 'Admin → Users & Access → Invite User',
    done: () => false, // can't check without user list — always shows until dismissed
  },
  {
    id: 'compliance',
    label: 'Add first compliance deadline',
    hint: 'Finance → Compliances → click a date',
    done: () => false,
  },
];

export default function OnboardingChecklist() {
  const { store } = useApp();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(KEY) === '1');
  const [collapsed, setCollapsed] = useState(false);

  if (dismissed) return null;

  const completed = STEPS.filter(s => s.done(store));
  const pct = Math.round((completed.length / STEPS.length) * 100);
  const allDone = completed.length === STEPS.length;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
            {pct}%
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">
              {allDone ? '🎉 Setup complete!' : 'Get started — finish your setup'}
            </p>
            <p className="text-xs text-blue-600">{completed.length} of {STEPS.length} steps done</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <button onClick={e => { e.stopPropagation(); localStorage.setItem(KEY, '1'); setDismissed(true); }}
              className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Dismiss
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); localStorage.setItem(KEY, '1'); setDismissed(true); }}
            className="p-1 rounded hover:bg-blue-100 text-blue-400">
            <X className="w-4 h-4" />
          </button>
          {collapsed ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronUp className="w-4 h-4 text-blue-400" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {STEPS.map(step => {
            const done = step.done(store);
            return (
              <div key={step.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${done ? 'bg-emerald-50' : 'bg-white'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'border-2 border-gray-200'}`}>
                  {done && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{step.label}</p>
                  {!done && <p className="text-xs text-gray-400">{step.hint}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
