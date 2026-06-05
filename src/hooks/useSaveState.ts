/**
 * Global save-state bus. Any component can call markSaving() / markSaved() / markError().
 * The SaveIndicator component listens and renders the current state.
 */

type Listener = (state: SaveState) => void;
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

let _state: SaveState = 'idle';
let _savedTimer: ReturnType<typeof setTimeout> | null = null;
const _listeners = new Set<Listener>();

function setState(s: SaveState) {
  _state = s;
  _listeners.forEach(l => l(s));
}

export function markSaving() {
  if (_savedTimer) { clearTimeout(_savedTimer); _savedTimer = null; }
  setState('saving');
}

export function markSaved() {
  setState('saved');
  _savedTimer = setTimeout(() => setState('idle'), 2500);
}

export function markError() {
  setState('error');
  _savedTimer = setTimeout(() => setState('idle'), 4000);
}

export function getSaveState(): SaveState { return _state; }

export function subscribeSaveState(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
