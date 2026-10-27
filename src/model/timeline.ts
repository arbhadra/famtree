import type { LogEntry, TreeState } from './types';
import { displayName, yearOf } from './people';
import { formatEntryDate } from './logbook';

export interface TimelineItem {
  key: string;
  year: number | null;
  /** Sort key within a year. */
  sortKey: string;
  kind: 'birth' | 'death' | 'entry';
  title: string;
  subtitle: string;
  personId?: string;
  entryId?: string;
}

/** Births and deaths from the tree plus every logbook entry, oldest first; undated entries last. */
export function buildTimeline(tree: TreeState, entries: LogEntry[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const p of Object.values(tree.people)) {
    const by = yearOf(p.year);
    if (by !== null)
      items.push({
        key: 'b' + p.id,
        year: by,
        sortKey: String(by),
        kind: 'birth',
        title: `${displayName(p)} is born`,
        subtitle: [p.year, p.birthplace].filter(Boolean).join(' · '),
        personId: p.id,
      });
    const dy = yearOf(p.died);
    if (dy !== null)
      items.push({
        key: 'd' + p.id,
        year: dy,
        sortKey: String(dy),
        kind: 'death',
        title: `${displayName(p)} passes away`,
        subtitle: p.died,
        personId: p.id,
      });
  }
  for (const e of entries) {
    const y = yearOf(e.date);
    items.push({
      key: 'e' + e.id,
      year: y,
      sortKey: e.date || '9999',
      kind: 'entry',
      title: e.title || 'Untitled entry',
      subtitle: [formatEntryDate(e), e.place].filter(Boolean).join(' · '),
      entryId: e.id,
    });
  }
  return items.sort((a, b) => {
    if ((a.year === null) !== (b.year === null)) return a.year === null ? 1 : -1;
    return a.sortKey.localeCompare(b.sortKey) || a.title.localeCompare(b.title);
  });
}
