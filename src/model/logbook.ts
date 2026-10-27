import type { DateQualifier, EntryType, LogEntry } from './types';

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  memory: 'Memory',
  event: 'Event',
  birth: 'Birth',
  marriage: 'Marriage',
  death: 'Death',
  migration: 'Migration',
  story: 'Story',
  recipe: 'Recipe',
  document: 'Document',
  other: 'Other',
};

export const QUALIFIER_LABELS: Record<DateQualifier, string> = {
  exact: 'On',
  about: 'About',
  before: 'Before',
  after: 'After',
  between: 'Between',
};

export const entryId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'e' + Math.random().toString(36).slice(2, 12);

export function newEntry(o: Partial<LogEntry> = {}, now = new Date().toISOString()): LogEntry {
  return {
    id: entryId(),
    title: '',
    type: 'memory',
    date: '',
    dateEnd: '',
    dateQualifier: 'exact',
    place: '',
    people: [],
    body: '',
    media: [],
    sources: '',
    needsVerification: false,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...o,
  };
}

/** Accepts "YYYY", "YYYY-MM" or "YYYY-MM-DD" with a real month/day. */
export function isValidPartialDate(s: string): boolean {
  if (!s) return true;
  const m = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return false;
  const [, , mo, d] = m;
  if (mo && (Number(mo) < 1 || Number(mo) > 12)) return false;
  if (d) {
    const dt = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(dt.getTime()) && dt.getUTCDate() === Number(d);
  }
  return true;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatPartialDate(s: string): string {
  const m = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!m) return s;
  const [, y, mo, d] = m;
  if (d) return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
  if (mo) return `${MONTHS[Number(mo) - 1]} ${y}`;
  return y;
}

export function formatEntryDate(e: Pick<LogEntry, 'date' | 'dateEnd' | 'dateQualifier'>): string {
  if (!e.date) return 'Date unknown';
  const a = formatPartialDate(e.date);
  switch (e.dateQualifier) {
    case 'about':
      return `c. ${a}`;
    case 'before':
      return `Before ${a}`;
    case 'after':
      return `After ${a}`;
    case 'between':
      return e.dateEnd ? `${a} – ${formatPartialDate(e.dateEnd)}` : a;
    default:
      return a;
  }
}

/** Plain text from the story HTML, for excerpts and search. */
export function plainText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h\d|\/li|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function excerpt(html: string, max = 160): string {
  const t = plainText(html);
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
}

export type EntrySort = 'date-desc' | 'date-asc' | 'updated';

export interface EntryFilter {
  q?: string;
  type?: EntryType | '';
  personId?: string;
  sort?: EntrySort;
}

export function filterEntries(
  entries: LogEntry[],
  f: EntryFilter,
  nameOf: (id: string) => string = () => '',
): LogEntry[] {
  const q = (f.q || '').trim().toLowerCase();
  const list = entries.filter((e) => {
    if (f.type && e.type !== f.type) return false;
    if (f.personId && !e.people.includes(f.personId)) return false;
    if (!q) return true;
    const hay = [e.title, e.place, e.sources, plainText(e.body), ...e.people.map(nameOf)]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
  const sort = f.sort || 'date-desc';
  return list.sort((a, b) => {
    if (sort === 'updated') return b.updatedAt.localeCompare(a.updatedAt);
    // undated entries always sink to the end
    if (!a.date !== !b.date) return a.date ? -1 : 1;
    const c = a.date.localeCompare(b.date);
    return (sort === 'date-asc' ? c : -c) || b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function entriesForPerson(entries: LogEntry[], personId: string): LogEntry[] {
  return filterEntries(entries, { personId, sort: 'date-asc' });
}
