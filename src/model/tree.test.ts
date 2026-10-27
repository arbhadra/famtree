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
  getRootId,
  relationFor,
  removePerson,
  siblingIds,
} from './tree';
import { isTreeState } from './persistence';

const seq = () => {
  let n = 0;
  return () => 'id' + ++n;
};

describe('relationFor', () => {
  it('names relatives by generation, gender and side', () => {
    expect(relationFor(-1, 'male', 'self')).toBe('Father');
    expect(relationFor(-1, 'female', 'spouse')).toBe('Mother-in-law');
    expect(relationFor(-2, 'female', 'self')).toBe('Grandmother');
    expect(relationFor(-3, 'male', 'self')).toBe('Great-Grandfather');
    expect(relationFor(-2, 'other', 'spouse')).toBe("Partner's Grandparent");
    expect(relationFor(0, 'female', 'self')).toBe('Sister');
    expect(relationFor(1, 'other', 'self')).toBe('Child');
    expect(relationFor(3, 'male', 'self')).toBe('Great-Grandson');
  });
});

describe('mutations', () => {
  it('adds a parent, only one per gender, without mutating the input', () => {
    const id = seq();
    const t0 = freshTree(id);
    const c1 = addParent(t0, t0.meId, 'male', id);
    expect(Object.keys(t0.people)).toHaveLength(1);
    expect(Object.keys(c1.state.people)).toHaveLength(2);
    expect(c1.message).toBe('Added a father');
    const dup = addParent(c1.state, t0.meId, 'male', id);
    expect(dup.state).toBe(c1.state);
  });

  it('makes the second parent a spouse of the first', () => {
    const id = seq();
    let s = freshTree(id);
    s = addParent(s, s.meId, 'male', id).state;
    const c = addParent(s, s.meId, 'female', id);
    const [dad, mum] = c.state.people[c.state.meId].parents.map((x) => c.state.people[x]);
    expect(dad.spouses).toContain(mum.id);
    expect(mum.spouses).toContain(dad.id);
    expect(mum.relation).toBe('Mother');
  });

  it('creates a shared parent when adding a sibling to a parentless person', () => {
    const id = seq();
    const s0 = freshTree(id);
    const c = addSibling(s0, s0.meId, id);
    expect(c.state.people[s0.meId].parents).toHaveLength(1);
    expect(siblingIds(c.state, s0.meId)).toEqual([c.focusId]);
    expect(c.state.people[c.focusId!].relation).toBe('Sibling');
  });

  it('gives a child both partners as parents', () => {
    const id = seq();
    let s = freshTree(id);
    s = addPartner(s, s.meId, id).state;
    const c = addChild(s, s.meId, id);
    expect(c.state.people[c.focusId!].parents).toHaveLength(2);
    expect(c.state.people[c.focusId!].relation).toBe('Child');
    expect(childrenOf(c.state, s.meId)).toHaveLength(1);
  });

  it('removes a person and prunes anyone left disconnected', () => {
    const id = seq();
    let s = freshTree(id);
    const p = addParent(s, s.meId, 'male', id);
    s = p.state;
    const gp = addParent(s, p.focusId!, 'male', id);
    s = gp.state;
    expect(Object.keys(s.people)).toHaveLength(3);
    s = removePerson(s, p.focusId!).state;
    expect(Object.keys(s.people)).toEqual([s.meId]);
  });

  it('never removes "me"', () => {
    const s = freshTree(seq());
    expect(removePerson(s, s.meId).state).toBe(s);
  });
});

describe('queries', () => {
  it('computes signed generations and the tree root', () => {
    const id = seq();
    let s = freshTree(id);
    const p = addParent(s, s.meId, 'female', id);
    s = p.state;
    const gp = addParent(s, p.focusId!, 'male', id);
    s = gp.state;
    const k = addChild(s, s.meId, id);
    s = k.state;
    expect(genFrom(s, p.focusId!)).toBe(-1);
    expect(genFrom(s, gp.focusId!)).toBe(-2);
    expect(genFrom(s, k.focusId!)).toBe(1);
    expect(getRootId(s)).toBe(gp.focusId);
    expect(generationSpan(s)).toBe(4);
  });
});

describe('persistence', () => {
  it('validates stored shape', () => {
    expect(isTreeState(freshTree(seq()))).toBe(true);
    expect(isTreeState({ people: {}, meId: 'x' })).toBe(false);
    expect(isTreeState(null)).toBe(false);
  });
});
