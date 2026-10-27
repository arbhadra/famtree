import { describe, expect, it } from 'vitest';
import type { TreeState } from './types';
import {
  addChild,
  addParent,
  addPartner,
  addSibling,
  freshTree,
  makePerson,
  setParentLink,
  setUnion,
  updatePerson,
} from './tree';
import { toGedcom } from './gedcom';
import { buildTimeline } from './timeline';
import { portraitFor } from './age';
import { kinship, kinshipMap, relationLabel } from './kinship';
import { visibleIds } from './view';
import { computeLayout, isotonicRow, SIZES } from './layout';

const seq = () => {
  let n = 0;
  return () => 'id' + ++n;
};

/** A blended family:
 *  Grandpa ─ Grandma          StepGrandpa ─ StepGrandma
 *      │                              │
 *  Dad ─(divorced)─ Mum ─ Stepdad ────┘ (Stepdad is StepGrandparents' son)
 *      │                 │
 *  Me, Sister, HalfBro (Dad + Dad's 2nd wife), StepSis (Stepdad's daughter)
 *  Aunt (Dad's sister) ─ Uncle-by-marriage; Cousin; Cousin's son. Me ─ Wife; Son; Stepson.
 */
function blended() {
  const id = seq();
  let s = freshTree(id);
  const g = (gender: 'male' | 'female') => gender;
  const step = (c: { state: TreeState; focusId?: string }, name: string) => {
    s = updatePerson(c.state, c.focusId!, { name });
    return c.focusId!;
  };
  s = updatePerson(s, s.meId, { name: 'Me', gender: 'female' });
  const dad = step(addParent(s, s.meId, g('male'), 'birth', id), 'Dad');
  const mum = step(addParent(s, s.meId, g('female'), 'birth', id), 'Mum');
  s = {
    ...s,
    unions: {
      ...s.unions,
      [[dad, mum].sort().join('|')]: { status: 'divorced', start: '', end: '' },
    },
  };
  const sister = step(addSibling(s, s.meId, 'female', 'full', id), 'Sister');
  const wife2 = step(addPartner(s, dad, 'female', {}, id), 'Dad’s wife');
  const halfBro = step(addChild(s, dad, wife2, 'male', 'birth', id), 'HalfBro');
  const stepdad = step(addPartner(s, mum, 'male', {}, id), 'Stepdad');
  const stepSis = step(addChild(s, stepdad, null, 'female', 'birth', id), 'StepSis');
  const stepGpa = step(addParent(s, stepdad, 'male', 'birth', id), 'StepGrandpa');
  const gpa = step(addParent(s, dad, 'male', 'birth', id), 'Grandpa');
  const gma = step(addParent(s, dad, 'female', 'birth', id), 'Grandma');
  const aunt = step(addSibling(s, dad, 'female', 'full', id), 'Aunt');
  const uncle = step(addPartner(s, aunt, 'male', {}, id), 'Uncle');
  const cousin = step(addChild(s, aunt, uncle, 'male', 'birth', id), 'Cousin');
  const cousinSon = step(addChild(s, cousin, null, 'male', 'birth', id), 'CousinSon');
  const greatAunt = step(addSibling(s, gpa, 'female', 'full', id), 'GreatAunt');
  const wife = step(addPartner(s, s.meId, 'male', {}, id), 'Husband');
  const son = step(addChild(s, s.meId, wife, 'male', 'birth', id), 'Son');
  const stepson = step(addChild(s, wife, null, 'male', 'birth', id), 'Stepson');
  const adopted = step(addChild(s, s.meId, wife, 'female', 'adopted', id), 'Adopted');
  const niece = step(addChild(s, sister, null, 'female', 'birth', id), 'Niece');
  const fil = step(addParent(s, wife, 'male', 'birth', id), 'FatherInLaw');
  return {
    s,
    ids: {
      dad,
      mum,
      sister,
      wife2,
      halfBro,
      stepdad,
      stepSis,
      stepGpa,
      gpa,
      gma,
      aunt,
      uncle,
      cousin,
      cousinSon,
      greatAunt,
      wife,
      son,
      stepson,
      adopted,
      niece,
      fil,
    },
  };
}

describe('kinship', () => {
  const { s, ids } = blended();
  const k = (id: string) => kinship(s, id);

  it('names blood relatives, including half-siblings and removed cousins', () => {
    expect(k(s.meId)).toBe('You');
    expect(k(ids.dad)).toBe('Father');
    expect(k(ids.gma)).toBe('Grandmother');
    expect(k(ids.sister)).toBe('Sister');
    expect(k(ids.halfBro)).toBe('Half-brother');
    expect(k(ids.aunt)).toBe('Aunt');
    expect(k(ids.greatAunt)).toBe('Great-aunt');
    expect(k(ids.cousin)).toBe('First cousin');
    expect(k(ids.cousinSon)).toBe('First cousin once removed');
    expect(k(ids.niece)).toBe('Niece');
    expect(k(ids.son)).toBe('Son');
    expect(k(ids.adopted)).toBe('Adopted daughter');
  });

  it('names partners, step-family, in-laws and ex-partners', () => {
    expect(k(ids.wife)).toBe('Husband');
    expect(k(ids.stepdad)).toBe('Stepfather');
    expect(k(ids.wife2)).toBe('Stepmother');
    expect(k(ids.stepSis)).toBe('Stepsister');
    expect(k(ids.stepson)).toBe('Stepson');
    expect(k(ids.uncle)).toBe('Uncle by marriage');
    expect(k(ids.fil)).toBe('Father-in-law');
    expect(k(ids.stepGpa)).toBe('Step-grandfather');
  });

  it('describes an ex-partner of a parent from their side', () => {
    expect(kinship(s, ids.mum, ids.halfBro)).toBe('Father’s ex-wife');
  });

  it('prefers a custom label when one is set', () => {
    const map = kinshipMap(s);
    expect(relationLabel(s.people[ids.dad], map)).toBe('Father');
    expect(relationLabel({ ...s.people[ids.dad], relation: 'Papa' }, map)).toBe('Papa');
  });

  it('treats step and foster links as non-lineage', () => {
    const id = seq();
    let t = freshTree(id);
    const p = addParent(t, t.meId, 'female', 'birth', id);
    t = setParentLink(p.state, t.meId, p.focusId!, 'foster');
    expect(kinship(t, p.focusId!)).toBe('Foster mother');
  });
});

describe('view and layout', () => {
  const { s, ids } = blended();

  it('shows everyone, including step-grandparents and great-aunts', () => {
    const v = visibleIds(s);
    expect(v.size).toBe(Object.keys(s.people).length);
    const L = computeLayout(s, v);
    expect(Object.keys(L.nodes)).toHaveLength(v.size);
    expect(L.nodes[ids.stepGpa]).toBeDefined();
    expect(L.nodes[ids.greatAunt]).toBeDefined();
  });

  it('keeps generations in rows and never overlaps people', () => {
    const L = computeLayout(s, visibleIds(s));
    expect(L.nodes[ids.gpa].y).toBeLessThan(L.nodes[ids.dad].y);
    expect(L.nodes[ids.dad].y).toBe(L.nodes[ids.mum].y);
    expect(L.nodes[ids.dad].y).toBeLessThan(L.nodes[s.meId].y);
    expect(L.nodes[s.meId].y).toBe(L.nodes[ids.halfBro].y);
    const rows = new Map<number, number[]>();
    for (const n of Object.values(L.nodes)) rows.set(n.y, [...(rows.get(n.y) ?? []), n.x]);
    for (const xs of rows.values()) {
      xs.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++)
        expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(SIZES.nodeW);
    }
  });

  it('draws one bond per partnership with its status, and groups children by parents', () => {
    const L = computeLayout(s, visibleIds(s));
    const bond = L.bonds.find((b) => [b.a, b.b].sort().join() === [ids.dad, ids.mum].sort().join());
    expect(bond?.status).toBe('divorced');
    const myFamily = L.kin.find((k) => k.drops.some((d) => d.childId === s.meId))!;
    expect(myFamily.drops.map((d) => d.childId).sort()).toEqual([s.meId, ids.sister].sort());
    const half = L.kin.find((k) => k.drops.some((d) => d.childId === ids.halfBro))!;
    expect(half.drops).toHaveLength(1);
    expect(L.kin.flatMap((k) => k.drops).find((d) => d.childId === ids.adopted)?.type).toBe(
      'adopted',
    );
  });

  it('places a person with two partners between them', () => {
    const L = computeLayout(s, visibleIds(s));
    const xs = [ids.wife2, ids.dad, ids.mum].map((id) => L.nodes[id].x);
    expect(Math.min(xs[0], xs[2]) < xs[1] && xs[1] < Math.max(xs[0], xs[2])).toBe(true);
  });

  it('hides folded branches and filters views', () => {
    const folded = updatePerson(s, s.meId, { collapsedUp: true });
    const v = visibleIds(folded);
    expect(v.has(ids.dad)).toBe(false);
    expect(v.has(ids.wife)).toBe(true);
    const direct = visibleIds(s, 'direct');
    expect(direct.has(ids.gpa)).toBe(true);
    expect(direct.has(ids.cousin)).toBe(false);
    const blood = visibleIds(s, 'blood');
    expect(blood.has(ids.cousin)).toBe(true);
    expect(blood.has(ids.stepSis)).toBe(false);
  });
});

describe('exports and timeline for complex families', () => {
  it('writes adoption pedigrees and divorces to GEDCOM', () => {
    const { s, ids } = blended();
    const t = setUnion(s, ids.dad, ids.mum, { status: 'divorced', start: '1985', end: '1999' });
    const ged = toGedcom(t, new Date('2026-01-01'));
    expect(ged).toContain('2 PEDI adopted');
    expect(ged).toMatch(/1 MARR\n2 DATE 1985\n1 DIV\n2 DATE 1999/);
    // Every family has at most two parents.
    for (const fam of ged.split('\n0 ').filter((b) => b.includes(' FAM\n')))
      expect((fam.match(/^1 (HUSB|WIFE) /gm) ?? []).length).toBeLessThanOrEqual(2);
  });

  it('puts marriages and divorces on the timeline', () => {
    const { s, ids } = blended();
    const t = setUnion(s, ids.dad, ids.mum, { status: 'divorced', start: '1985', end: '1999' });
    const titles = buildTimeline(t, []).map((i) => i.title);
    expect(titles).toContain('Dad and Mum marry');
    expect(titles).toContain('Dad and Mum divorce');
  });
});

describe('default portraits', () => {
  it('picks a life stage from age, age at death, or generation', () => {
    const base = makePerson({ gender: 'female' });
    expect(portraitFor({ ...base, year: '2025' }, 0, null, 2026).stage).toBe('baby');
    expect(portraitFor({ ...base, year: '2018' }, 0, null, 2026).stage).toBe('child');
    expect(portraitFor({ ...base, year: '2010' }, 0, null, 2026).stage).toBe('teen');
    expect(portraitFor({ ...base, year: '1980' }, 0, null, 2026).stage).toBe('adult');
    expect(portraitFor({ ...base, year: '1940' }, 0, null, 2026).stage).toBe('elder');
    // Died young: shown at the age they died, and marked deceased.
    const p = portraitFor({ ...base, year: '1930', died: '1938' }, 0, null, 2026);
    expect(p).toMatchObject({ stage: 'child', deceased: true, age: 8 });
    // No dates: grandparents look elderly, children young.
    expect(portraitFor(base, -2, 1990, 2026)).toMatchObject({ stage: 'elder', estimated: true });
    expect(portraitFor(base, 1, 1990, 2026).stage).toBe('child');
    expect(portraitFor(base, 0, null, 2026).stage).toBe('adult');
  });
});

describe('isotonicRow', () => {
  it('honours gaps while staying as close as possible to the desired positions', () => {
    expect(isotonicRow([0, 300], [100, 100], [20], [1, 1])).toEqual([0, 300]);
    // Both want x=0: they split the difference around it.
    expect(isotonicRow([0, 0], [100, 100], [20], [1, 1])).toEqual([-60, 60]);
    // A heavier block moves less.
    const [a, b] = isotonicRow([0, 0], [100, 100], [20], [3, 1]);
    expect(b - a).toBe(120);
    expect(Math.abs(a)).toBeLessThan(Math.abs(b));
  });
});
