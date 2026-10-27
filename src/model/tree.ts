import type { Change, Gender, Person, Side, TreeState } from './types';

export type IdGen = () => string;
export const defaultId: IdGen = () => 'p' + Math.random().toString(36).slice(2, 9);

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

export function siblingIds(s: TreeState, id: string): string[] {
  const set = new Set<string>();
  s.people[id].parents.forEach((pa) =>
    childrenOf(s, pa).forEach((c) => {
      if (c.id !== id) set.add(c.id);
    }),
  );
  return [...set];
}

/** Climb first-parent links from "me" to the topmost ancestor: the root of the rendered tree. */
export function getRootId(s: TreeState): string {
  let id = s.meId;
  const seen = new Set<string>();
  while (s.people[id].parents[0] && !seen.has(s.people[id].parents[0])) {
    seen.add(id);
    id = s.people[id].parents[0];
  }
  return id;
}

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
      ...siblingIds(s, cur).map((x): [string, number] => [x, g]),
    ];
    for (const [n, ng] of neighbours) {
      if (n === id) return ng;
      if (!seen.has(n)) {
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
    s.people[id].parents.forEach((pa) => {
      if (!seen.has(pa)) {
        seen.add(pa);
        up(pa);
      }
    });
  };
  up(p.id);
  return seen.size;
}

export function relationFor(gen: number, gender: Gender, side: Side): string {
  const mf = (m: string, f: string, n: string) =>
    gender === 'male' ? m : gender === 'female' ? f : n;
  if (gen === 0) return mf('Brother', 'Sister', 'Sibling');
  if (gen < 0) {
    const up = -gen;
    if (up === 1)
      return side === 'spouse'
        ? mf('Father-in-law', 'Mother-in-law', 'Parent-in-law')
        : mf('Father', 'Mother', 'Parent');
    const greats = 'Great-'.repeat(up - 2);
    const base = mf('Grandfather', 'Grandmother', 'Grandparent');
    return (side === 'spouse' ? "Partner's " : '') + greats + base;
  }
  if (gen === 1) return mf('Son', 'Daughter', 'Child');
  return 'Great-'.repeat(gen - 2) + mf('Grandson', 'Granddaughter', 'Grandchild');
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
    spouses: [],
    ...o,
  };
}

export function freshTree(id: IdGen = defaultId): TreeState {
  const me = makePerson({ gender: 'self', side: 'self', relation: 'Me' }, id);
  return { people: { [me.id]: me }, meId: me.id };
}

function linkSpouses(a: Person, b: Person) {
  if (!a.spouses.includes(b.id)) a.spouses.push(b.id);
  if (!b.spouses.includes(a.id)) b.spouses.push(a.id);
}

function add(s: TreeState, p: Person) {
  s.people[p.id] = p;
  return p;
}

export function addParent(
  prev: TreeState,
  childId: string,
  gender: Gender,
  id: IdGen = defaultId,
): Change {
  if (parentsOf(prev, prev.people[childId]).some((p) => p.gender === gender))
    return { state: prev };
  const s = clone(prev);
  const child = s.people[childId];
  const np = add(
    s,
    makePerson(
      {
        gender,
        side: child.side,
        relation: relationFor(genFrom(s, childId) - 1, gender, child.side),
      },
      id,
    ),
  );
  if (child.parents.length) linkSpouses(np, s.people[child.parents[0]]); // co-parent of the existing parent
  child.parents.push(np.id);
  child.collapsedUp = false;
  return {
    state: s,
    focusId: np.id,
    message: gender === 'male' ? 'Added a father' : 'Added a mother',
  };
}

export function addPartner(prev: TreeState, personId: string, id: IdGen = defaultId): Change {
  const s = clone(prev);
  const np = add(s, makePerson({ gender: 'other', side: 'spouse', relation: 'Partner' }, id));
  linkSpouses(np, s.people[personId]);
  return {
    state: s,
    focusId: np.id,
    message: personId === s.meId ? 'Added your partner — trace their side too' : 'Added a partner',
  };
}

export function addSibling(prev: TreeState, personId: string, id: IdGen = defaultId): Change {
  const s = clone(prev);
  const person = s.people[personId];
  if (!person.parents.length) {
    const par = add(
      s,
      makePerson(
        {
          gender: 'other',
          side: person.side,
          relation: relationFor(genFrom(s, personId) - 1, 'other', person.side),
        },
        id,
      ),
    );
    person.parents.push(par.id);
  }
  const np = add(
    s,
    makePerson(
      {
        gender: 'other',
        side: person.side,
        relation: relationFor(genFrom(s, personId), 'other', person.side),
        parents: [...person.parents],
      },
      id,
    ),
  );
  return { state: s, focusId: np.id, message: 'Added a sibling' };
}

export function addChild(prev: TreeState, personId: string, id: IdGen = defaultId): Change {
  const s = clone(prev);
  const person = s.people[personId];
  const parents = [person.id];
  if (person.spouses[0]) parents.push(person.spouses[0]);
  const np = add(
    s,
    makePerson(
      {
        gender: 'other',
        side: person.side,
        relation: relationFor(genFrom(s, personId) + 1, 'other', person.side),
        parents,
      },
      id,
    ),
  );
  person.collapsedDown = false;
  return { state: s, focusId: np.id, message: 'Added a child' };
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
  return s;
}

export function removePerson(prev: TreeState, id: string): Change {
  if (id === prev.meId) return { state: prev };
  const s = clone(prev);
  delete s.people[id];
  Object.values(s.people).forEach((q) => {
    q.parents = q.parents.filter((x) => x !== id);
    q.spouses = q.spouses.filter((x) => x !== id);
  });
  return { state: prune(s), message: 'Removed' };
}

export function updatePerson(prev: TreeState, id: string, patch: Partial<Person>): TreeState {
  if (!prev.people[id]) return prev;
  return { ...prev, people: { ...prev.people, [id]: { ...prev.people[id], ...patch } } };
}
