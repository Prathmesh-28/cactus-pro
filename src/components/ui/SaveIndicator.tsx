import { useState, useEffect } from 'react';
import { CloudOff, Check, Loader2 } from 'lucide-react';
import { getSaveState, subscribeSaveState, type SaveState } from '../../hooks/useSaveState';

export default function SaveIndicator() {
  const [state, setState] = useState<SaveState>(getSaveState());

  useEffect(() => subscribeSaveState(setState), []);

  if (state === 'idle') return null;

  const configs = {
    saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: 'Saving…',  bg: 'bg-blue-500' },
    saved:  { icon: <Check     className="w-3.5 h-3.5" />,            text: 'Saved',     bg: 'bg-emerald-500' },
    error:  { icon: <CloudOff  className="w-3.5 h-3.5" />,            text: 'Save failed — check connection', bg: 'bg-red-500' },
  };

  const c = configs[state];
  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs font-medium shadow-lg transition-all ${c.bg}`}>
      {c.icon} {c.text}
    </div>
  );
}
