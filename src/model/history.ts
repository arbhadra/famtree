import type { TreeState } from './types';

export const HISTORY_LIMIT = 60;
/** Edits to the same field within this window merge into one undo step (typing a name). */
export const COALESCE_MS = 1200;

export interface History {
  past: TreeState[];
  present: TreeState;
  future: TreeState[];
  /** Key and time of the last coalescable edit. */
  lastKey: string | null;
  lastAt: number;
}

export const initHistory = (present: TreeState): History => ({
  past: [],
  present,
  future: [],
  lastKey: null,
  lastAt: 0,
});

/** Record a new state. Pass `key` for edits that may merge with the previous one. */
export function push(
  h: History,
  next: TreeState,
  key: string | null = null,
  now = Date.now(),
): History {
  if (next === h.present) return h;
  const merge = key !== null && key === h.lastKey && now - h.lastAt < COALESCE_MS;
  const past = merge ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
  return { past, present: next, future: [], lastKey: key, lastAt: now };
}

export function undo(h: History): History {
  if (!h.past.length) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    lastKey: null,
    lastAt: 0,
  };
}

export function redo(h: History): History {
  if (!h.future.length) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    lastKey: null,
    lastAt: 0,
  };
}
