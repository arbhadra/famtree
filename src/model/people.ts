import type { Person, TreeState } from './types';
import { childrenOf, parentsOf, siblingIds, spousesOf } from './tree';

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
    spouses: [],
    ...p,
  };
}

export function normalizeTree(t: TreeState): TreeState {
  const people: Record<string, Person> = {};
  for (const [id, p] of Object.entries(t.people)) people[id] = normalizePerson({ ...p, id });
  return { ...t, people };
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

export function displayName(p: Pick<Person, 'name' | 'relation'> | undefined): string {
  if (!p) return 'Unknown';
  return p.name.trim() || p.relation || 'Unnamed';
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
export function searchPeople(s: TreeState, query: string): Person[] {
  const q = query.trim().toLowerCase();
  const all = Object.values(s.people);
  if (!q) return all.sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const score = (p: Person) => {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (p.relation.toLowerCase().includes(q)) return 2;
    if ((p.birthplace + ' ' + p.occupation).toLowerCase().includes(q)) return 3;
    return -1;
  };
  return all
    .map((p) => [p, score(p)] as const)
    .filter(([, sc]) => sc >= 0)
    .sort((a, b) => a[1] - b[1] || displayName(a[0]).localeCompare(displayName(b[0])))
    .map(([p]) => p);
}
