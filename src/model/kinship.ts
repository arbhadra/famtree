import type { Gender, Person, TreeState, UnionStatus } from './types';
import { isLineage, linkType, lineageParents, unionOf } from './tree';

/* Names how each person is related to "me": blood relatives by their nearest common ancestor
   (cousins with degree and removal), then partners, in-laws, step-family and ex-partners. */

const pick = (g: Gender, m: string, f: string, n: string) =>
  g === 'male' ? m : g === 'female' ? f : n;
const great = (n: number) => 'Great-'.repeat(Math.max(0, n));
const ORD = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];
const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times'];
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Lineage ancestors of `id` with their distance (the person themself at 0). */
function ancestors(s: TreeState, id: string): Map<string, number> {
  const dist = new Map<string, number>([[id, 0]]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    const p = s.people[cur];
    if (!p) continue;
    for (const par of lineageParents(s, p)) {
      if (!dist.has(par)) {
        dist.set(par, dist.get(cur)! + 1);
        queue.push(par);
      }
    }
  }
  return dist;
}

export interface Blood {
  /** Steps up from A to the common ancestor. */
  up: number;
  /** Steps down from the common ancestor to B. */
  down: number;
}

export function bloodRelation(
  s: TreeState,
  a: string,
  b: string,
  cache = new Map<string, Map<string, number>>(),
): Blood | null {
  const anc = (id: string) => {
    if (!cache.has(id)) cache.set(id, ancestors(s, id));
    return cache.get(id)!;
  };
  const A = anc(a);
  const B = anc(b);
  let best: Blood | null = null;
  for (const [id, up] of A) {
    const down = B.get(id);
    if (down === undefined) continue;
    if (
      !best ||
      up + down < best.up + best.down ||
      (up + down === best.up + best.down && up < best.up)
    )
      best = { up, down };
  }
  return best;
}

function halfSiblings(s: TreeState, a: Person, b: Person): boolean {
  const pa = lineageParents(s, a);
  const pb = lineageParents(s, b);
  const shared = pa.filter((x) => pb.includes(x)).length;
  return shared === 1 && (pa.length > 1 || pb.length > 1);
}

/** Name a blood relation from (up, down) as seen by `from`, for a target of gender `g`. */
export function bloodName(
  rel: Blood,
  g: Gender,
  opts: { half?: boolean; adopted?: boolean } = {},
): string {
  const { up: u, down: d } = rel;
  if (u === 0 && d === 0) return 'You';
  if (u === 0) {
    if (d === 1)
      return (
        (opts.adopted ? 'Adopted ' : '') +
        (opts.adopted ? pick(g, 'son', 'daughter', 'child') : pick(g, 'Son', 'Daughter', 'Child'))
      );
    return great(d - 2) + pick(g, 'Grandson', 'Granddaughter', 'Grandchild');
  }
  if (d === 0) {
    if (u === 1)
      return opts.adopted
        ? `Adoptive ${pick(g, 'father', 'mother', 'parent')}`
        : pick(g, 'Father', 'Mother', 'Parent');
    return great(u - 2) + pick(g, 'Grandfather', 'Grandmother', 'Grandparent');
  }
  if (u === 1 && d === 1)
    return (
      (opts.half ? 'Half-' : '') +
      (opts.half
        ? pick(g, 'brother', 'sister', 'sibling')
        : pick(g, 'Brother', 'Sister', 'Sibling'))
    );
  if (d === 1)
    return (
      great(u - 2) +
      (u > 2
        ? lowerFirst(pick(g, 'Uncle', 'Aunt', 'Parent’s sibling'))
        : pick(g, 'Uncle', 'Aunt', 'Parent’s sibling'))
    );
  if (u === 1)
    return (
      great(d - 2) +
      (d > 2
        ? lowerFirst(pick(g, 'Nephew', 'Niece', 'Sibling’s child'))
        : pick(g, 'Nephew', 'Niece', 'Sibling’s child'))
    );
  const degree = Math.min(u, d) - 1;
  const removed = Math.abs(u - d);
  const base = `${ORD[degree] ?? `${degree}th`} cousin`;
  return removed ? `${base} ${TIMES[removed] ?? `${removed} times`} removed` : base;
}

function partnerWord(g: Gender, status: UnionStatus, deceased: boolean): string {
  switch (status) {
    case 'divorced':
      return pick(g, 'Ex-husband', 'Ex-wife', 'Ex-partner');
    case 'separated':
      return pick(g, 'Separated husband', 'Separated wife', 'Separated partner');
    case 'engaged':
      return pick(g, 'Fiancé', 'Fiancée', 'Fiancé(e)');
    case 'partner':
      return 'Partner';
    case 'widowed':
      return (
        (deceased ? 'Late ' : '') +
        (deceased
          ? lowerFirst(pick(g, 'Husband', 'Wife', 'Spouse'))
          : pick(g, 'Husband', 'Wife', 'Spouse'))
      );
    default:
      return pick(g, 'Husband', 'Wife', 'Spouse');
  }
}

const isEx = (st: UnionStatus) => st === 'divorced' || st === 'separated';

/** Relationship of `targetId` to "me" (or to `fromId`). */
export function kinship(
  s: TreeState,
  targetId: string,
  fromId = s.meId,
  cache = new Map<string, Map<string, number>>(),
): string {
  if (targetId === fromId) return 'You';
  const me = s.people[fromId];
  const t = s.people[targetId];
  if (!me || !t) return '';
  const g = t.gender;

  // 1. Blood (including adoption).
  const blood = bloodRelation(s, fromId, targetId, cache);
  if (blood) {
    const adopted =
      (blood.up === 1 && blood.down === 0 && linkType(me, targetId) === 'adopted') ||
      (blood.up === 0 && blood.down === 1 && linkType(t, fromId) === 'adopted');
    const half = blood.up === 1 && blood.down === 1 && halfSiblings(s, me, t);
    return bloodName(blood, g, { half, adopted });
  }

  // 2. My partner.
  if (me.spouses.includes(targetId))
    return partnerWord(g, unionOf(s, fromId, targetId).status, !!t.died);

  // 3. Partner of one of my blood relatives (step-parents, in-laws, aunts by marriage).
  let viaRel: { rel: Blood; r: Person } | null = null;
  for (const rid of t.spouses) {
    const r = s.people[rid];
    if (!r || rid === fromId) continue;
    const rel = bloodRelation(s, fromId, rid, cache);
    if (rel && (!viaRel || rel.up + rel.down < viaRel.rel.up + viaRel.rel.down))
      viaRel = { rel, r };
  }
  if (viaRel) {
    const { rel, r } = viaRel;
    const st = unionOf(s, targetId, r.id).status;
    const rName = bloodName(rel, r.gender);
    if (isEx(st)) return `${rName}’s ${lowerFirst(partnerWord(g, st, false))}`;
    if (rel.down === 0 && rel.up === 1) return pick(g, 'Stepfather', 'Stepmother', 'Step-parent');
    if (rel.down === 0)
      return (
        great(rel.up - 2) + pick(g, 'Step-grandfather', 'Step-grandmother', 'Step-grandparent')
      );
    if (rel.up === 1 && rel.down === 1)
      return pick(g, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law');
    if (rel.up === 0 && rel.down === 1)
      return pick(g, 'Son-in-law', 'Daughter-in-law', 'Child-in-law');
    if (rel.down === 1 && rel.up >= 2) {
      const title = pick(g, 'Uncle', 'Aunt', '');
      if (title)
        return great(rel.up - 2) + (rel.up > 2 ? lowerFirst(title) : title) + ' by marriage';
    }
    return `${rName}’s ${lowerFirst(partnerWord(g, st, !!t.died))}`;
  }

  // 4. Blood relative of my partner (parents-in-law, stepchildren).
  const partners = me.spouses
    .map((id) => s.people[id])
    .filter(Boolean)
    .sort(
      (a, b) =>
        Number(isEx(unionOf(s, fromId, a.id).status)) -
        Number(isEx(unionOf(s, fromId, b.id).status)),
    );
  for (const p of partners) {
    const rel = bloodRelation(s, p.id, targetId, cache);
    if (!rel) continue;
    const ex = isEx(unionOf(s, fromId, p.id).status);
    const pre = ex ? 'Former ' : '';
    const fix = (x: string) => (ex ? pre + lowerFirst(x) : x);
    if (rel.up === 1 && rel.down === 0)
      return fix(pick(g, 'Father-in-law', 'Mother-in-law', 'Parent-in-law'));
    if (rel.up === 1 && rel.down === 1)
      return fix(pick(g, 'Brother-in-law', 'Sister-in-law', 'Sibling-in-law'));
    if (rel.up === 0 && rel.down === 1) return fix(pick(g, 'Stepson', 'Stepdaughter', 'Stepchild'));
    if (rel.up === 0)
      return fix(
        great(rel.down - 2) + pick(g, 'Step-grandson', 'Step-granddaughter', 'Step-grandchild'),
      );
    const pw = lowerFirst(partnerWord(p.gender, unionOf(s, fromId, p.id).status, !!p.died));
    return `${upperFirst(pw)}’s ${lowerFirst(bloodName(rel, g))}`;
  }

  // 5. Step-family through my parents' other partners: their children and their parents.
  for (const parId of me.parents) {
    const par = s.people[parId];
    if (!par) continue;
    for (const sp of par.spouses) {
      const stepParent = s.people[sp];
      if (!stepParent || me.parents.includes(sp)) continue;
      if (t.parents.includes(sp) && isLineage(linkType(t, sp)))
        return pick(g, 'Stepbrother', 'Stepsister', 'Step-sibling');
      if (lineageParents(s, stepParent).includes(targetId))
        return pick(g, 'Step-grandfather', 'Step-grandmother', 'Step-grandparent');
    }
  }

  // 6. A child linked to me by a step, foster or guardian relationship.
  if (t.parents.includes(fromId)) {
    const lt = linkType(t, fromId);
    if (lt === 'step') return pick(g, 'Stepson', 'Stepdaughter', 'Stepchild');
    if (lt === 'foster') return 'Foster child';
    if (lt === 'guardian') return 'Ward';
  }
  if (me.parents.includes(targetId)) {
    const lt = linkType(me, targetId);
    if (lt === 'step') return pick(g, 'Stepfather', 'Stepmother', 'Step-parent');
    if (lt === 'foster') return `Foster ${pick(g, 'father', 'mother', 'parent')}`;
    if (lt === 'guardian') return 'Guardian';
  }

  return 'Relative by marriage';
}

/** Computed relationship for everyone in the tree. */
export function kinshipMap(s: TreeState): Record<string, string> {
  const cache = new Map<string, Map<string, number>>();
  const out: Record<string, string> = {};
  for (const id of Object.keys(s.people)) out[id] = kinship(s, id, s.meId, cache);
  return out;
}

/** What to show under a name: a custom label if set, else the computed relationship. */
export const relationLabel = (p: Person, computed: Record<string, string>) =>
  p.relation.trim() || computed[p.id] || '';
