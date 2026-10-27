import type { Person, TreeState } from './types';
import { childrenOf, parentsOf, siblingIds, spousesOf, TREE_VERSION } from './tree';

// Labels the original app wrote automatically; version 2 computes these instead of storing them.
const AUTO_RELATION =
  /^(me|partner|sibling|brother|sister|son|daughter|child|(partner's )?(great-)*(grand)?(father|mother|parent)|(father|mother|parent)-in-law|(great-)*grand(son|daughter|child))$/i;

/** Fill fields added after v4 so older saved trees load with every field present. */
export function normalizePerson(p: Partial<Person> & { id: string }): Person {
  return {
    name: '',
    relation: '',
    gender: 'other',
    side: 'self',
    year: '',
    died: '',
    birthplace: '',
    occupation: '',
    notes: '',
    photo: null,
    collapsedUp: false,
    collapsedDown: false,
    parents: [],
    parentTypes: {},
    spouses: [],
    ...p,
  };
}

/** Upgrade any saved tree to the current format. */
export function normalizeTree(t: TreeState): TreeState {
  const old = (t.version ?? 1) < 2;
  const people: Record<string, Person> = {};
  for (const [id, p] of Object.entries(t.people)) {
    const n = normalizePerson({ ...p, id });
    if (old && AUTO_RELATION.test(n.relation.trim())) n.relation = '';
    people[id] = n;
  }
  return { ...t, people, unions: t.unions ?? {}, version: TREE_VERSION };
}

/** First four-digit year in a free-form date, or null. */
export function yearOf(date: string | undefined): number | null {
  const m = (date || '').match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : null;
}

/** "1958 – 2020", "b. 1958", "d. 2020" or "". */
export function lifespan(p: Pick<Person, 'year' | 'died'>): string {
  const b = yearOf(p.year) ?? (p.year.trim() || null);
  const d = yearOf(p.died) ?? (p.died.trim() || null);
  if (b && d) return `${b} – ${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return '';
}

export function displayName(
  p: Pick<Person, 'name' | 'relation'> | undefined,
  fallback = 'Unnamed',
): string {
  if (!p) return 'Unknown';
  return p.name.trim() || p.relation || fallback;
}

export interface Relatives {
  parents: Person[];
  partners: Person[];
  children: Person[];
  siblings: Person[];
}

export function relativesOf(s: TreeState, id: string): Relatives {
  const p = s.people[id];
  return {
    parents: parentsOf(s, p),
    partners: spousesOf(s, p),
    children: childrenOf(s, id),
    siblings: siblingIds(s, id).map((x) => s.people[x]),
  };
}

/** Case-insensitive search over name, relation, birthplace and occupation; best matches first. */
export function searchPeople(
  s: TreeState,
  query: string,
  labelOf: (p: Person) => string = (p) => p.relation,
): Person[] {
  const q = query.trim().toLowerCase();
  const all = Object.values(s.people);
  if (!q) return all.sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const score = (p: Person) => {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (labelOf(p).toLowerCase().includes(q)) return 2;
    if ((p.birthplace + ' ' + p.occupation).toLowerCase().includes(q)) return 3;
    return -1;
  };
  return all
    .map((p) => [p, score(p)] as const)
    .filter(([, sc]) => sc >= 0)
    .sort((a, b) => a[1] - b[1] || displayName(a[0]).localeCompare(displayName(b[0])))
    .map(([p]) => p);
}
