import type { TreeState } from './types';

// Same key and shape as the original single-file app, so existing trees carry over.
export const STORE_KEY = 'familyTree.v4';
export const HINT_KEY = 'ft_hint_v4';

export function isTreeState(s: unknown): s is TreeState {
  const t = s as TreeState | null;
  return !!t && !!t.people && typeof t.meId === 'string' && !!t.people[t.meId];
}

export function loadTree(storage: Pick<Storage, 'getItem'> = localStorage): TreeState | null {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isTreeState(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(e);
  }
  return null;
}

export function saveTree(s: TreeState, storage: Pick<Storage, 'setItem'> = localStorage) {
  try {
    storage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn(e);
  }
}
