import type { Change, Gender, ParentLink, Person, TreeState, Union } from './types';

export type IdGen = () => string;
export const defaultId: IdGen = () => 'p' + Math.random().toString(36).slice(2, 9);

export const TREE_VERSION = 2;

/* ------------------------------ queries ------------------------------ */

export const personById = (s: TreeState, id: string): Person | undefined => s.people[id];

export function childrenOf(s: TreeState, id: string): Person[] {
  return Object.values(s.people).filter((p) => p.parents.includes(id));
}

export function parentsOf(s: TreeState, p: Person): Person[] {
  return p.parents.map((id) => s.people[id]).filter(Boolean);
}

export function spousesOf(s: TreeState, p: Person): Person[] {
  return p.spouses.map((id) => s.people[id]).filter(Boolean);
}

export const linkType = (p: Person, parentId: string): ParentLink =>
  p.parentTypes?.[parentId] ?? 'birth';

/** Birth and adoptive parents: the links that make someone family by descent. */
export const isLineage = (t: ParentLink) => t === 'birth' || t === 'adopted';

export function lineageParents(s: TreeState, p: Person): string[] {
  return p.parents.filter((id) => s.people[id] && isLineage(linkType(p, id)));
}

export function siblingIds(s: TreeState, id: string): string[] {
  const set = new Set<string>();
  s.people[id].parents.forEach((pa) =>
    childrenOf(s, pa).forEach((c) => {
      if (c.id !== id) set.add(c.id);
    }),
  );
  return [...set];
}

export const unionKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function unionOf(s: TreeState, a: string, b: string): Union {
  return s.unions?.[unionKey(a, b)] ?? { status: 'married', start: '', end: '' };
}

/** Order two partners of `id` by when the partnership began; undated ones keep their order. */
export function byUnionStart(s: TreeState, id: string) {
  return (a: string, b: string) => {
    const ya = yearIn(unionOf(s, id, a).start);
    const yb = yearIn(unionOf(s, id, b).start);
    return ya !== null && yb !== null ? ya - yb : 0;
  };
}
const yearIn = (d: string) => {
  const m = (d || '').match(/\b(\d{4})\b/);
  return m ? Number(m[1]) : null;
};

/** Signed generation distance from "me" (BFS): negative is an ancestor, positive a descendant. */
export function genFrom(s: TreeState, id: string): number {
  if (id === s.meId) return 0;
  const queue: [string, number][] = [[s.meId, 0]];
  const seen = new Set([s.meId]);
  while (queue.length) {
    const [cur, g] = queue.shift()!;
    const p = s.people[cur];
    const neighbours: [string, number][] = [
      ...p.parents.map((x): [string, number] => [x, g - 1]),
      ...childrenOf(s, cur).map((c): [string, number] => [c.id, g + 1]),
      ...p.spouses.map((x): [string, number] => [x, g]),
    ];
    for (const [n, ng] of neighbours) {
      if (n === id) return ng;
      if (!seen.has(n) && s.people[n]) {
        seen.add(n);
        queue.push([n, ng]);
      }
    }
  }
  return 0;
}

export function countAbove(s: TreeState, p: Person): number {
  const seen = new Set<string>();
  const up = (id: string) => {
    s.people[id]?.parents.forEach((pa) => {
      if (!seen.has(pa) && s.people[pa]) {
        seen.add(pa);
        up(pa);
      }
    });
  };
  up(p.id);
  return seen.size;
}

export function generationSpan(s: TreeState): number {
  let lo = 0;
  let hi = 0;
  Object.keys(s.people).forEach((id) => {
    const g = genFrom(s, id);
    if (g < lo) lo = g;
    if (g > hi) hi = g;
  });
  return hi - lo + 1;
}

/* ------------------------------ mutations ----------------------------- */
// Every mutation clones the state and returns a new one; the input is never modified.

const clone = (s: TreeState): TreeState => structuredClone(s);

export function makePerson(o: Partial<Person>, id: IdGen = defaultId): Person {
  return {
    id: id(),
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
    ...o,
  };
}

export function freshTree(id: IdGen = defaultId): TreeState {
  const me = makePerson({ gender: 'self', side: 'self' }, id);
  return { people: { [me.id]: me }, meId: me.id, unions: {}, version: TREE_VERSION };
}

function link(s: TreeState, a: Person, b: Person, union?: Partial<Union>) {
  if (!a.spouses.includes(b.id)) a.spouses.push(b.id);
  if (!b.spouses.includes(a.id)) b.spouses.push(a.id);
  if (union) s.unions[unionKey(a.id, b.id)] = { ...unionOf(s, a.id, b.id), ...union };
}

function attach(child: Person, parentId: string, type: ParentLink) {
  if (!child.parents.includes(parentId)) child.parents.push(parentId);
  if (type === 'birth') delete child.parentTypes[parentId];
  else child.parentTypes[parentId] = type;
}

function add(s: TreeState, p: Person) {
  s.people[p.id] = p;
  return p;
}

const word = (g: Gender, m: string, f: string, n: string) =>
  g === 'male' ? m : g === 'female' ? f : n;

export function addParent(
  prev: TreeState,
  childId: string,
  gender: Gender,
  type: ParentLink = 'birth',
  id: IdGen = defaultId,
): Change {
  const c0 = prev.people[childId];
  const sameType = c0.parents.filter((p) => prev.people[p] && linkType(c0, p) === type);
  // Two birth parents at most, one of each recorded gender.
  if (
    type === 'birth' &&
    (sameType.length >= 2 ||
      sameType.some((p) => prev.people[p].gender === gender && gender !== 'other'))
  )
    return { state: prev };
  const s = clone(prev);
  const child = s.people[childId];
  const np = add(s, makePerson({ gender, side: child.side }, id));
  attach(child, np.id, type);
  // The other parent of the same kind becomes this parent's partner.
  if ((type === 'birth' || type === 'adopted') && sameType.length === 1)
    link(s, np, s.people[sameType[0]]);
  child.collapsedUp = false;
  const label =
    type === 'birth'
      ? word(gender, 'father', 'mother', 'parent')
      : `${type === 'adopted' ? 'adoptive' : type} ${word(gender, 'father', 'mother', 'parent')}`;
  return { state: s, focusId: np.id, message: `Added a ${label}` };
}

export function addPartner(
  prev: TreeState,
  personId: string,
  gender: Gender = 'other',
  union: Partial<Union> = {},
  id: IdGen = defaultId,
): Change {
  const s = clone(prev);
  const person = s.people[personId];
  const np = add(
    s,
    makePerson(
      { gender, side: person.side === 'self' && personId === s.meId ? 'spouse' : person.side },
      id,
    ),
  );
  link(s, np, person, { status: 'married', start: '', end: '', ...union });
  const role = word(gender, 'husband', 'wife', 'partner');
  return {
    state: s,
    focusId: np.id,
    message: personId === s.meId ? `Added your ${role} — trace their side too` : `Added a ${role}`,
  };
}

export function addChild(
  prev: TreeState,
  personId: string,
  otherParentId: string | null,
  gender: Gender = 'other',
  type: ParentLink = 'birth',
  id: IdGen = defaultId,
): Change {
  const s = clone(prev);
  const person = s.people[personId];
  const np = add(s, makePerson({ gender, side: person.side }, id));
  attach(np, person.id, type);
  if (otherParentId && s.people[otherParentId]) attach(np, otherParentId, type);
  person.collapsedDown = false;
  const other = otherParentId ? s.people[otherParentId] : null;
  const role = word(gender, 'son', 'daughter', 'child');
  return {
    state: s,
    focusId: np.id,
    message: other?.name ? `Added a ${role} with ${other.name.split(' ')[0]}` : `Added a ${role}`,
  };
}

/** `via` is "full" (same birth parents) or the id of the one parent shared by a half-sibling. */
export function addSibling(
  prev: TreeState,
  personId: string,
  gender: Gender = 'other',
  via: 'full' | string = 'full',
  id: IdGen = defaultId,
): Change {
  const s = clone(prev);
  const person = s.people[personId];
  let parents = via === 'full' ? lineageParents(s, person) : [via];
  if (!parents.length) {
    // Siblings are linked through a parent; create an unnamed one if none is recorded yet.
    const par = add(s, makePerson({ side: person.side }, id));
    attach(person, par.id, 'birth');
    parents = [par.id];
  }
  const np = add(s, makePerson({ gender, side: person.side }, id));
  parents.forEach((pid) => attach(np, pid, linkType(person, pid)));
  const role = word(gender, 'brother', 'sister', 'sibling');
  return { state: s, focusId: np.id, message: `Added a ${via === 'full' ? '' : 'half-'}${role}` };
}

export function setUnion(prev: TreeState, a: string, b: string, patch: Partial<Union>): TreeState {
  return {
    ...prev,
    unions: { ...prev.unions, [unionKey(a, b)]: { ...unionOf(prev, a, b), ...patch } },
  };
}

export function setParentLink(
  prev: TreeState,
  childId: string,
  parentId: string,
  type: ParentLink,
): TreeState {
  const s = clone(prev);
  attach(s.people[childId], parentId, type);
  return s;
}

/** Drop anyone no longer connected to "me". */
export function prune(s: TreeState): TreeState {
  const keep = new Set<string>();
  const queue = [s.meId];
  while (queue.length) {
    const id = queue.shift()!;
    if (!id || keep.has(id) || !s.people[id]) continue;
    keep.add(id);
    s.people[id].parents.forEach((x) => queue.push(x));
    s.people[id].spouses.forEach((x) => queue.push(x));
    childrenOf(s, id).forEach((c) => queue.push(c.id));
  }
  Object.keys(s.people).forEach((id) => {
    if (!keep.has(id)) delete s.people[id];
  });
  for (const k of Object.keys(s.unions)) {
    const [a, b] = k.split('|');
    if (!s.people[a] || !s.people[b]) delete s.unions[k];
  }
  return s;
}

export function removePerson(prev: TreeState, id: string): Change {
  if (id === prev.meId) return { state: prev };
  const s = clone(prev);
  delete s.people[id];
  Object.values(s.people).forEach((q) => {
    q.parents = q.parents.filter((x) => x !== id);
    delete q.parentTypes[id];
    q.spouses = q.spouses.filter((x) => x !== id);
  });
  return { state: prune(s), message: 'Removed' };
}

export function updatePerson(prev: TreeState, id: string, patch: Partial<Person>): TreeState {
  if (!prev.people[id]) return prev;
  return { ...prev, people: { ...prev.people, [id]: { ...prev.people[id], ...patch } } };
}
