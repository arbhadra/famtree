import type { LogEntry, TreeState } from './types';
import { isTreeState } from './persistence';
import { normalizeTree } from './people';
import { newEntry } from './logbook';

export interface Backup {
  app: 'famtree';
  version: 1;
  exportedAt: string;
  tree: TreeState;
  entries: LogEntry[];
}

export function makeBackup(tree: TreeState, entries: LogEntry[], now = new Date()): Backup {
  return { app: 'famtree', version: 1, exportedAt: now.toISOString(), tree, entries };
}

/** Parse a backup file; throws a readable error when it isn't one. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const b = data as Partial<Backup>;
  if (b?.app !== 'famtree' || !isTreeState(b.tree))
    throw new Error('That file is not a Family Tree backup.');
  const entries = Array.isArray(b.entries) ? b.entries.map((e) => newEntry(e)) : [];
  return {
    app: 'famtree',
    version: 1,
    exportedAt: b.exportedAt || '',
    tree: normalizeTree(b.tree),
    entries,
  };
}
