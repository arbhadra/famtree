import type { LogEntry, TreeState } from './types';
import { displayName, yearOf } from './people';
import { formatEntryDate } from './logbook';

export interface TimelineItem {
  key: string;
  year: number | null;
  /** Sort key within a year. */
  sortKey: string;
  kind: 'birth' | 'death' | 'union' | 'entry';
  title: string;
  subtitle: string;
  personId?: string;
  entryId?: string;
}

/** Births, deaths and partnerships from the tree plus every logbook entry, oldest first; undated last. */
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
  // Partnerships with a recorded year.
  for (const [key, u] of Object.entries(tree.unions ?? {})) {
    const [a, b] = key.split('|').map((id) => tree.people[id]);
    if (!a || !b) continue;
    const names = `${displayName(a)} and ${displayName(b)}`;
    const sy = yearOf(u.start);
    if (sy !== null)
      items.push({
        key: 'u' + key,
        year: sy,
        sortKey: String(sy),
        kind: 'union',
        title:
          u.status === 'partner'
            ? `${names} become partners`
            : u.status === 'engaged'
              ? `${names} are engaged`
              : `${names} marry`,
        subtitle: u.start,
        personId: a.id,
      });
    const ey = yearOf(u.end);
    if (ey !== null && (u.status === 'divorced' || u.status === 'separated'))
      items.push({
        key: 'x' + key,
        year: ey,
        sortKey: String(ey),
        kind: 'union',
        title: `${names} ${u.status === 'divorced' ? 'divorce' : 'separate'}`,
        subtitle: u.end,
        personId: a.id,
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
