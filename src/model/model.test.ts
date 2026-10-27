import { describe, expect, it } from 'vitest';
import { addChild, addParent, addPartner, freshTree, updatePerson } from './tree';
import { lifespan, normalizeTree, relativesOf, searchPeople, yearOf } from './people';
import { COALESCE_MS, initHistory, push, redo, undo } from './history';
import {
  excerpt,
  filterEntries,
  formatEntryDate,
  isValidPartialDate,
  newEntry,
  plainText,
} from './logbook';
import { buildTimeline } from './timeline';
import { gedcomDate, gedcomName, toGedcom } from './gedcom';
import { makeBackup, parseBackup } from './backup';
import type { TreeState } from './types';

const seq = () => {
  let n = 0;
  return () => 'id' + ++n;
};

function family() {
  const id = seq();
  let s = freshTree(id);
  s = updatePerson(s, s.meId, { name: 'Arnab Bhadra', gender: 'male', year: '12 Mar 1990' });
  const dad = addParent(s, s.meId, 'male', id);
  s = updatePerson(dad.state, dad.focusId!, { name: 'Ravi Bhadra', year: '1960', died: '2020' });
  const mum = addParent(s, s.meId, 'female', id);
  s = updatePerson(mum.state, mum.focusId!, { name: 'Mira Bhadra', birthplace: 'Kolkata' });
  const partner = addPartner(s, s.meId, id);
  s = updatePerson(partner.state, partner.focusId!, { name: 'Sara Sen', gender: 'female' });
  const kid = addChild(s, s.meId, id);
  s = updatePerson(kid.state, kid.focusId!, { name: 'Tara Bhadra', year: '2021' });
  return { s, dad: dad.focusId!, mum: mum.focusId!, partner: partner.focusId!, kid: kid.focusId! };
}

describe('people', () => {
  it('extracts years and formats lifespans', () => {
    expect(yearOf('c. 1900')).toBe(1900);
    expect(yearOf('')).toBeNull();
    expect(lifespan({ year: '1960', died: '3 Jan 2020' })).toBe('1960 – 2020');
    expect(lifespan({ year: '1990', died: '' })).toBe('b. 1990');
    expect(lifespan({ year: '', died: '' })).toBe('');
  });

  it('upgrades v4 people that lack the newer fields', () => {
    const old = { meId: 'a', people: { a: { id: 'a', name: 'X', parents: [], spouses: [] } } };
    const t = normalizeTree(old as unknown as TreeState);
    expect(t.people.a.died).toBe('');
    expect(t.people.a.notes).toBe('');
    expect(t.people.a.name).toBe('X');
  });

  it('lists relatives and searches by name, relation and place', () => {
    const { s, dad, mum, partner, kid } = family();
    const r = relativesOf(s, s.meId);
    expect(r.parents.map((p) => p.id).sort()).toEqual([dad, mum].sort());
    expect(r.partners.map((p) => p.id)).toEqual([partner]);
    expect(r.children.map((p) => p.id)).toEqual([kid]);
    expect(searchPeople(s, 'bha').map((p) => p.name)).toEqual([
      'Arnab Bhadra',
      'Mira Bhadra',
      'Ravi Bhadra',
      'Tara Bhadra',
    ]);
    expect(searchPeople(s, 'kolk').map((p) => p.id)).toEqual([mum]);
    expect(searchPeople(s, 'partner').map((p) => p.id)).toEqual([partner]);
  });
});

describe('history', () => {
  it('undoes and redoes', () => {
    const a = freshTree(seq());
    const b = updatePerson(a, a.meId, { name: 'B' });
    let h = push(initHistory(a), b);
    h = undo(h);
    expect(h.present).toBe(a);
    h = redo(h);
    expect(h.present).toBe(b);
  });

  it('merges rapid edits to the same field into one step', () => {
    const a = freshTree(seq());
    let h = initHistory(a);
    h = push(h, updatePerson(a, a.meId, { name: 'A' }), 'name', 1000);
    h = push(h, updatePerson(h.present, a.meId, { name: 'Ar' }), 'name', 1500);
    h = push(h, updatePerson(h.present, a.meId, { name: 'Arn' }), 'name', 2000);
    expect(h.past).toHaveLength(1);
    h = push(h, updatePerson(h.present, a.meId, { name: 'Arna' }), 'name', 2000 + COALESCE_MS + 1);
    expect(h.past).toHaveLength(2);
    expect(undo(undo(h)).present).toBe(a);
  });

  it('drops the redo stack on a new change', () => {
    const a = freshTree(seq());
    let h = push(initHistory(a), updatePerson(a, a.meId, { name: 'B' }));
    h = undo(h);
    h = push(h, updatePerson(a, a.meId, { name: 'C' }));
    expect(h.future).toHaveLength(0);
  });
});

describe('logbook', () => {
  it('validates partial dates', () => {
    expect(isValidPartialDate('1950')).toBe(true);
    expect(isValidPartialDate('1950-06')).toBe(true);
    expect(isValidPartialDate('1950-02-29')).toBe(false);
    expect(isValidPartialDate('1952-02-29')).toBe(true);
    expect(isValidPartialDate('1950-13')).toBe(false);
    expect(isValidPartialDate('June 1950')).toBe(false);
  });

  it('formats qualified dates', () => {
    const d = (date: string, q: 'exact' | 'about' | 'between', dateEnd = '') =>
      formatEntryDate({ date, dateEnd, dateQualifier: q });
    expect(d('1950-06-14', 'exact')).toBe('14 Jun 1950');
    expect(d('1950', 'about')).toBe('c. 1950');
    expect(d('1939', 'between', '1945-05')).toBe('1939 – May 1945');
    expect(d('', 'exact')).toBe('Date unknown');
  });

  it('extracts plain text and excerpts from story HTML', () => {
    expect(plainText('<h2>Arrival</h2><p>We came by <b>ship</b> &amp; train.</p>')).toBe(
      'Arrival We came by ship & train.',
    );
    expect(excerpt('<p>' + 'word '.repeat(60) + '</p>', 20)).toMatch(/…$/);
  });

  it('filters by text, type and person, and sorts undated entries last', () => {
    const a = newEntry({ title: 'Wedding', type: 'marriage', date: '1985-04', people: ['p1'] });
    const b = newEntry({
      title: 'Voyage',
      type: 'migration',
      date: '1962',
      body: '<p>Bombay to London</p>',
    });
    const c = newEntry({ title: 'Recipe', type: 'recipe' });
    const all = [c, a, b];
    expect(filterEntries(all, {}).map((e) => e.title)).toEqual(['Wedding', 'Voyage', 'Recipe']);
    expect(filterEntries(all, { sort: 'date-asc' }).map((e) => e.title)).toEqual([
      'Voyage',
      'Wedding',
      'Recipe',
    ]);
    expect(filterEntries(all, { q: 'london' }).map((e) => e.title)).toEqual(['Voyage']);
    expect(filterEntries(all, { type: 'marriage' })).toEqual([a]);
    expect(filterEntries(all, { personId: 'p1' })).toEqual([a]);
    expect(filterEntries(all, { q: 'ravi' }, (id) => (id === 'p1' ? 'Ravi' : ''))).toEqual([a]);
  });
});

describe('timeline', () => {
  it('merges births, deaths and entries in date order', () => {
    const { s, dad } = family();
    const e = newEntry({ title: 'Moved to Delhi', date: '1985' });
    const undated = newEntry({ title: 'Grandma’s dal' });
    const items = buildTimeline(s, [undated, e]);
    expect(items.map((i) => i.title)).toEqual([
      'Ravi Bhadra is born',
      'Moved to Delhi',
      'Arnab Bhadra is born',
      'Ravi Bhadra passes away',
      'Tara Bhadra is born',
      'Grandma’s dal',
    ]);
    expect(items[0].personId).toBe(dad);
  });
});

describe('gedcom', () => {
  it('converts dates and names', () => {
    expect(gedcomDate('1958-03-12')).toBe('12 MAR 1958');
    expect(gedcomDate('12 March 1958')).toBe('12 MAR 1958');
    expect(gedcomDate('c. 1900')).toBe('ABT 1900');
    expect(gedcomDate('Mar 1958')).toBe('MAR 1958');
    expect(gedcomName('Arnab Kumar Bhadra')).toBe('Arnab Kumar /Bhadra/');
    expect(gedcomName('')).toBe('/Unknown/');
  });

  it('writes individuals and families', () => {
    const { s } = family();
    const ged = toGedcom(s, new Date('2026-01-02'));
    expect(ged.startsWith('0 HEAD')).toBe(true);
    expect(ged.trim().endsWith('0 TRLR')).toBe(true);
    expect(ged.match(/ INDI$/gm)).toHaveLength(5);
    expect(ged.match(/ FAM$/gm)).toHaveLength(2); // parents' family + my family
    expect(ged).toContain('1 NAME Ravi /Bhadra/');
    expect(ged).toContain('2 PLAC Kolkata');
    expect(ged).toContain('1 DEAT\n2 DATE 2020');
    expect(ged).toMatch(/1 HUSB @I\d+@\n1 WIFE @I\d+@\n1 CHIL @I\d+@/);
  });
});

describe('backup', () => {
  it('round-trips and rejects foreign files', () => {
    const { s } = family();
    const e = newEntry({ title: 'X' });
    const back = parseBackup(JSON.stringify(makeBackup(s, [e])));
    expect(back.tree).toEqual(s);
    expect(back.entries[0].id).toBe(e.id);
    expect(() => parseBackup('{')).toThrow(/not valid JSON/);
    expect(() => parseBackup('{"a":1}')).toThrow(/not a Family Tree backup/);
  });
});
