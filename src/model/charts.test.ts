import { describe, expect, it } from 'vitest';
import type { TreeState } from './types';
import {
  addChild,
  addParent,
  addPartner,
  freshTree,
  setParentLink,
  setUnion,
  updatePerson,
} from './tree';
import {
  ancestorSlots,
  BOX,
  descendantChart,
  fanChart,
  houseName,
  orderedParents,
  outlineChart,
  pedigreeChart,
  topAncestor,
} from './charts';
import { CsvError, fromCsv, parseCsvRows, toCsv } from './csv';
import { kinship } from './kinship';

const seq = () => {
  let n = 0;
  return () => 'id' + ++n;
};

function family() {
  const id = seq();
  let s: TreeState = freshTree(id);
  const name = (c: { state: TreeState; focusId?: string }, n: string, extra = {}) => {
    s = updatePerson(c.state, c.focusId!, { name: n, ...extra });
    return c.focusId!;
  };
  s = updatePerson(s, s.meId, { name: 'Arnab Bhadra', gender: 'male', year: '1990' });
  const mum = name(addParent(s, s.meId, 'female', 'birth', id), 'Mira Bhadra', { year: '1962' });
  const dad = name(addParent(s, s.meId, 'male', 'birth', id), 'Ravi Bhadra', { year: '1958' });
  const gpa = name(addParent(s, dad, 'male', 'birth', id), 'Hari Bhadra', { died: '2008' });
  const w1 = name(
    addPartner(s, s.meId, 'female', { status: 'divorced', start: '2012', end: '2016' }, id),
    'Anna, "Annie" Kerr',
  );
  const w2 = name(addPartner(s, s.meId, 'female', {}, id), 'Beth Moore');
  const k1 = name(addChild(s, s.meId, w1, 'male', 'birth', id), 'Leo Bhadra', { year: '2014' });
  const k2 = name(addChild(s, s.meId, w2, 'female', 'birth', id), 'Cara Bhadra', { year: '2021' });
  const k3 = name(addChild(s, s.meId, w2, 'female', 'adopted', id), '=Noor', {
    notes: 'line one\nline two',
  });
  return { s, ids: { mum, dad, gpa, w1, w2, k1, k2, k3 } };
}

describe('pedigree and fan charts', () => {
  const { s, ids } = family();

  it('orders parents father-side first and trims empty generations', () => {
    expect(orderedParents(s, s.meId)).toEqual([ids.dad, ids.mum]);
    const slots = ancestorSlots(s, s.meId, 6);
    expect(slots).toHaveLength(3);
    expect(slots[2][0]).toBe(ids.gpa);
    expect(slots[2][3]).toBeNull();
  });

  it('lays generations left to right with each parent beside its child', () => {
    const c = pedigreeChart(s, s.meId, 4);
    const box = (id: string) => c.boxes.find((b) => b.personId === id)!;
    expect(box(s.meId).role).toBe('focus');
    expect(box(ids.dad).x).toBeGreaterThan(box(s.meId).x);
    expect(box(ids.dad).y).toBeLessThan(box(ids.mum).y);
    expect(box(ids.gpa).x).toBeGreaterThan(box(ids.dad).x);
    // Unknown grandparents get placeholder boxes; there's no box for a parent of a placeholder.
    expect(c.boxes.filter((b) => b.role === 'empty')).toHaveLength(3);
    expect(c.lines).toHaveLength(c.boxes.length - 1);
    for (const b of c.boxes) expect(b.y + b.h).toBeLessThanOrEqual(c.height);
  });

  it('draws fan rings that cover the full circle per generation', () => {
    const c = fanChart(s, s.meId, 5);
    expect(c.center?.personId).toBe(s.meId);
    for (const g of [1, 2]) {
      const ring = c.sectors.filter((x) => x.gen === g);
      expect(ring).toHaveLength(2 ** g);
      const sweep = ring.reduce((t, x) => t + (x.a1 - x.a0), 0);
      expect(sweep).toBeCloseTo(Math.PI * 2);
    }
    expect(c.sectors.find((x) => x.gen === 1 && x.personId === ids.dad)!.a0).toBeCloseTo(Math.PI);
  });
});

describe('descendant and outline charts', () => {
  const { s, ids } = family();

  it('finds the top ancestor and lays descendants below with partners alongside', () => {
    expect(topAncestor(s, s.meId)).toBe(ids.gpa);
    const c = descendantChart(s, s.meId);
    const box = (id: string) => c.boxes.find((b) => b.personId === id)!;
    expect(box(ids.w1).role).toBe('partner');
    expect(box(ids.w1).y).toBe(box(s.meId).y);
    expect(box(ids.k1).y).toBeGreaterThan(box(s.meId).y);
    // Partners sit either side of the person; each couple's children sit on that couple's side.
    expect(box(ids.w2).x).toBeLessThan(box(s.meId).x);
    expect(box(s.meId).x).toBeLessThan(box(ids.w1).x);
    expect(box(ids.k2).x).toBeLessThan(box(ids.k1).x);
    expect(c.lines.some((l) => l.kind === 'ex')).toBe(true);
    expect(c.lines.some((l) => l.kind === 'adopted')).toBe(true);
    const xs = c.boxes
      .filter((b) => b.y === box(ids.k1).y)
      .map((b) => b.x)
      .sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeGreaterThanOrEqual(BOX.w);
  });

  it('indents each generation in the outline and lists partners inline', () => {
    const c = outlineChart(s, ids.gpa);
    const row = (id: string) => c.rows.find((r) => r.personId === id)!;
    expect(row(ids.gpa).depth).toBe(0);
    expect(row(ids.dad).depth).toBe(1);
    expect(row(s.meId).depth).toBe(2);
    expect(row(s.meId).partners.map((p) => p.label)).toEqual(['div. 2012', 'm.']);
    expect(c.rows.map((r) => r.personId)).not.toContain(ids.w1);
  });

  it('names the house after the focus person’s surname', () => {
    expect(houseName(s, s.meId)).toBe('Bhadra');
  });
});

describe('CSV', () => {
  const { s, ids } = family();

  it('round-trips a complex family, including quotes, newlines and formula-like names', () => {
    const csv = toCsv(s);
    expect(csv.startsWith('﻿id,name,gender')).toBe(true);
    expect(csv).toContain("'=Noor");
    const back = fromCsv(csv);
    expect(back.warnings).toEqual([]);
    const t = back.tree;
    expect(t.meId).toBe(s.meId);
    expect(t.people[ids.w1].name).toBe('Anna, "Annie" Kerr');
    expect(t.people[ids.k3].name).toBe('=Noor');
    expect(t.people[ids.k3].notes).toBe('line one\nline two');
    expect(t.people[ids.k3].parentTypes[s.meId]).toBe('adopted');
    expect(t.unions[[s.meId, ids.w1].sort().join('|')]).toEqual({
      status: 'divorced',
      start: '2012',
      end: '2016',
    });
    for (const id of Object.keys(s.people)) expect(kinship(t, id)).toBe(kinship(s, id));
  });

  it('parses quoted fields and CRLF', () => {
    expect(parseCsvRows('a,b\r\n"x, y","say ""hi"""\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ]);
  });

  it('accepts hand-written files and reports problems helpfully', () => {
    const text = [
      'ID,Name,Gender,Parents,Partners,Me',
      'a,Asha,f,,b:engaged,yes',
      'b,Bo,m,,,',
      'c,Cy,,a;b:fostr;zz,,',
    ].join('\n');
    const { tree, warnings } = fromCsv(text);
    expect(tree.people.a.gender).toBe('female');
    expect(tree.unions['a|b'].status).toBe('engaged');
    expect(tree.people.c.parents).toEqual(['a', 'b']);
    expect(warnings).toEqual([
      'Row 4: unknown parent type "fostr", treated as birth.',
      'Row 4: parent "zz" isn\'t in the file — skipped.',
    ]);
    expect(() => fromCsv('name\nx')).toThrow(CsvError);
    expect(() => fromCsv('id,name\na,A\na,B')).toThrow(/used twice/);
  });

  it('keeps existing photos for matching ids', () => {
    const withPhoto = updatePerson(s, ids.dad, { photo: 'data:image/jpeg;base64,xx' });
    const t = fromCsv(toCsv(s), withPhoto).tree;
    expect(t.people[ids.dad].photo).toBe('data:image/jpeg;base64,xx');
    void setUnion;
    void setParentLink;
  });
});

describe('README CSV example', () => {
  it('imports cleanly', async () => {
    const { readFileSync } = await import('node:fs');
    const csv = readFileSync('README.md', 'utf8').match(/```csv\n([\s\S]*?)```/)![1];
    const { tree, warnings } = fromCsv(csv);
    expect(warnings).toEqual([]);
    expect(Object.keys(tree.people)).toHaveLength(4);
    expect(kinship(tree, 'mum')).toBe('Mother');
    expect(kinship(tree, 'beth')).toBe('Wife');
    expect(tree.unions['dad|mum'].status).toBe('divorced');
  });
});
