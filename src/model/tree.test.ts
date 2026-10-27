import { describe, expect, it } from 'vitest';
import {
  addChild,
  addParent,
  addPartner,
  addSibling,
  childrenOf,
  freshTree,
  genFrom,
  generationSpan,
  linkType,
  removePerson,
  setParentLink,
  setUnion,
  siblingIds,
  unionOf,
  updatePerson,
} from './tree';
import { isTreeState } from './persistence';
import { normalizeTree } from './people';
import type { TreeState } from './types';

export const seq = () => {
  let n = 0;
  return () => 'id' + ++n;
};

describe('mutations', () => {
  it('adds birth parents, at most one per gender, without mutating the input', () => {
    const id = seq();
    const t0 = freshTree(id);
    const c1 = addParent(t0, t0.meId, 'male', 'birth', id);
    expect(Object.keys(t0.people)).toHaveLength(1);
    expect(Object.keys(c1.state.people)).toHaveLength(2);
    expect(c1.message).toBe('Added a father');
    expect(addParent(c1.state, t0.meId, 'male', 'birth', id).state).toBe(c1.state);
  });

  it('makes the second birth parent a partner of the first', () => {
    const id = seq();
    let s = freshTree(id);
    s = addParent(s, s.meId, 'male', 'birth', id).state;
    const c = addParent(s, s.meId, 'female', 'birth', id);
    const [dad, mum] = c.state.people[c.state.meId].parents.map((x) => c.state.people[x]);
    expect(dad.spouses).toContain(mum.id);
    expect(unionOf(c.state, dad.id, mum.id).status).toBe('married');
  });

  it('allows adoptive parents alongside birth parents', () => {
    const id = seq();
    let s = freshTree(id);
    s = addParent(s, s.meId, 'female', 'birth', id).state;
    const a = addParent(s, s.meId, 'female', 'adopted', id);
    expect(a.state.people[s.meId].parents).toHaveLength(2);
    expect(linkType(a.state.people[s.meId], a.focusId!)).toBe('adopted');
    expect(a.message).toBe('Added a adoptive mother');
  });

  it('adds children with a specific partner, or with no other parent', () => {
    const id = seq();
    let s = freshTree(id);
    const w1 = addPartner(s, s.meId, 'female', { status: 'divorced' }, id);
    s = w1.state;
    const w2 = addPartner(s, s.meId, 'female', {}, id);
    s = w2.state;
    const k1 = addChild(s, s.meId, w1.focusId!, 'male', 'birth', id);
    s = k1.state;
    const k2 = addChild(s, s.meId, w2.focusId!, 'female', 'birth', id);
    s = k2.state;
    const k3 = addChild(s, s.meId, null, 'other', 'adopted', id);
    s = k3.state;
    expect(s.people[k1.focusId!].parents).toEqual([s.meId, w1.focusId]);
    expect(s.people[k2.focusId!].parents).toEqual([s.meId, w2.focusId]);
    expect(s.people[k3.focusId!].parents).toEqual([s.meId]);
    expect(linkType(s.people[k3.focusId!], s.meId)).toBe('adopted');
    expect(unionOf(s, s.meId, w1.focusId!).status).toBe('divorced');
    expect(childrenOf(s, s.meId)).toHaveLength(3);
  });

  it('adds full siblings through both parents and half-siblings through one', () => {
    const id = seq();
    let s = freshTree(id);
    const dad = addParent(s, s.meId, 'male', 'birth', id);
    s = dad.state;
    const mum = addParent(s, s.meId, 'female', 'birth', id);
    s = mum.state;
    const full = addSibling(s, s.meId, 'female', 'full', id);
    const half = addSibling(full.state, s.meId, 'male', dad.focusId!, id);
    expect(full.state.people[full.focusId!].parents.sort()).toEqual(
      [dad.focusId, mum.focusId].sort(),
    );
    expect(half.state.people[half.focusId!].parents).toEqual([dad.focusId]);
    expect(half.message).toBe('Added a half-brother');
  });

  it('creates a shared parent when adding a sibling to a parentless person', () => {
    const id = seq();
    const s0 = freshTree(id);
    const c = addSibling(s0, s0.meId, 'other', 'full', id);
    expect(c.state.people[s0.meId].parents).toHaveLength(1);
    expect(siblingIds(c.state, s0.meId)).toEqual([c.focusId]);
  });

  it('edits unions and parent links', () => {
    const id = seq();
    let s = freshTree(id);
    const p = addPartner(s, s.meId, 'male', {}, id);
    s = setUnion(p.state, s.meId, p.focusId!, { status: 'separated', start: '2001' });
    expect(unionOf(s, p.focusId!, s.meId)).toEqual({ status: 'separated', start: '2001', end: '' });
    const k = addChild(s, s.meId, p.focusId!, 'male', 'birth', id);
    s = setParentLink(k.state, k.focusId!, p.focusId!, 'step');
    expect(linkType(s.people[k.focusId!], p.focusId!)).toBe('step');
    s = setParentLink(s, k.focusId!, p.focusId!, 'birth');
    expect(s.people[k.focusId!].parentTypes).toEqual({});
  });

  it('removes a person, prunes the disconnected, and cleans unions and links', () => {
    const id = seq();
    let s = freshTree(id);
    const p = addParent(s, s.meId, 'male', 'birth', id);
    s = p.state;
    s = addParent(s, p.focusId!, 'male', 'birth', id).state;
    const w = addPartner(s, s.meId, 'female', { status: 'divorced' }, id);
    s = w.state;
    s = removePerson(s, p.focusId!).state;
    expect(Object.keys(s.people).sort()).toEqual([s.meId, w.focusId].sort());
    s = removePerson(s, w.focusId!).state;
    expect(s.unions).toEqual({});
    expect(removePerson(s, s.meId).state).toBe(s);
  });
});

describe('queries', () => {
  it('computes signed generations', () => {
    const id = seq();
    let s = freshTree(id);
    const p = addParent(s, s.meId, 'female', 'birth', id);
    s = p.state;
    const gp = addParent(s, p.focusId!, 'male', 'birth', id);
    s = gp.state;
    const k = addChild(s, s.meId, null, 'male', 'birth', id);
    s = k.state;
    expect(genFrom(s, p.focusId!)).toBe(-1);
    expect(genFrom(s, gp.focusId!)).toBe(-2);
    expect(genFrom(s, k.focusId!)).toBe(1);
    expect(generationSpan(s)).toBe(4);
  });
});

describe('persistence', () => {
  it('validates stored shape', () => {
    expect(isTreeState(freshTree(seq()))).toBe(true);
    expect(isTreeState({ people: {}, meId: 'x' })).toBe(false);
    expect(isTreeState(null)).toBe(false);
  });

  it('upgrades version-1 trees: clears auto-generated labels, keeps custom ones', () => {
    const v1 = {
      meId: 'a',
      people: {
        a: { id: 'a', name: 'Me', relation: 'Me', parents: ['b'], spouses: [] },
        b: { id: 'b', name: 'Dad', relation: 'Father', parents: [], spouses: [] },
        c: { id: 'c', name: 'Nan', relation: 'Godmother', parents: [], spouses: [] },
      },
    } as unknown as TreeState;
    const t = normalizeTree(v1);
    expect(t.version).toBe(2);
    expect(t.unions).toEqual({});
    expect(t.people.a.relation).toBe('');
    expect(t.people.b.relation).toBe('');
    expect(t.people.c.relation).toBe('Godmother');
    expect(t.people.b.parentTypes).toEqual({});
    // Already-upgraded trees keep whatever the user typed.
    const again = normalizeTree(updatePerson(t, 'b', { relation: 'Father' }));
    expect(again.people.b.relation).toBe('Father');
  });
});
