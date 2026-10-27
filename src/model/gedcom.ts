import type { ParentLink, TreeState } from './types';
import { linkType, unionOf } from './tree';

const PEDI: Record<ParentLink, string> = {
  birth: 'birth',
  adopted: 'adopted',
  foster: 'foster',
  step: 'step',
  guardian: 'foster',
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

/** Best-effort conversion of a free-form date to GEDCOM ("12 MAR 1958", "ABT 1900", "1958"). */
export function gedcomDate(input: string): string {
  const s = input.trim();
  if (!s) return '';
  const about = /^(c\.?|ca\.?|circa|about|abt\.?)\s*/i;
  if (about.test(s)) return 'ABT ' + gedcomDate(s.replace(about, ''));
  const iso = s.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (iso) {
    const [, y, m, d] = iso;
    return [d ? String(Number(d)) : '', m ? MONTHS[Number(m) - 1] : '', y]
      .filter(Boolean)
      .join(' ');
  }
  const dmy = s.match(/^(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})$/i);
  if (dmy && MONTH_NAMES.includes(dmy[2].toLowerCase()))
    return `${Number(dmy[1])} ${dmy[2].toUpperCase()} ${dmy[3]}`;
  const my = s.match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i);
  if (my && MONTH_NAMES.includes(my[1].toLowerCase())) return `${my[1].toUpperCase()} ${my[2]}`;
  return s.toUpperCase();
}

const clean = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

/** Split "Given Middle Surname" into GEDCOM's "Given Middle /Surname/". */
export function gedcomName(name: string): string {
  const parts = clean(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return '/Unknown/';
  if (parts.length === 1) return parts[0];
  const surname = parts.pop();
  return `${parts.join(' ')} /${surname}/`;
}

/** Export the tree as GEDCOM 5.5.1 text, the interchange format genealogy software reads. */
export function toGedcom(tree: TreeState, now = new Date()): string {
  const ids = Object.keys(tree.people);
  const indi = new Map(ids.map((id, i) => [id, `@I${i + 1}@`]));
  const lines: string[] = [
    '0 HEAD',
    '1 SOUR FAMTREE',
    '2 NAME Family Tree',
    '1 GEDC',
    '2 VERS 5.5.1',
    '2 FORM LINEAGE-LINKED',
    '1 CHAR UTF-8',
    `1 DATE ${gedcomDate(now.toISOString().slice(0, 10))}`,
  ];

  // Families: one per parent set (from children) plus childless couples. A GEDCOM family has at
  // most two parents, so a child's birth and adoptive (or step/foster) parents form separate ones.
  const fams = new Map<string, { parents: string[]; children: string[] }>();
  const pedigree = new Map<string, string>(); // `${child}@${famKey}` -> PEDI value
  const famKey = (ps: string[]) => [...ps].sort().join('+');
  for (const p of Object.values(tree.people)) {
    const byType = new Map<ParentLink, string[]>();
    for (const x of p.parents.filter((x) => tree.people[x])) {
      const t = linkType(p, x);
      byType.set(t, [...(byType.get(t) ?? []), x]);
    }
    for (const [t, parents] of byType) {
      for (let i = 0; i < parents.length; i += 2) {
        const set = parents.slice(i, i + 2);
        const k = famKey(set);
        if (!fams.has(k)) fams.set(k, { parents: set, children: [] });
        fams.get(k)!.children.push(p.id);
        if (t !== 'birth') pedigree.set(`${p.id}@${k}`, PEDI[t]);
      }
    }
  }
  for (const p of Object.values(tree.people))
    for (const s of p.spouses) {
      if (!tree.people[s]) continue;
      const k = famKey([p.id, s]);
      if (!fams.has(k)) fams.set(k, { parents: [p.id, s], children: [] });
    }
  const famIds = new Map([...fams.keys()].map((k, i) => [k, `@F${i + 1}@`]));

  for (const p of Object.values(tree.people)) {
    lines.push(`0 ${indi.get(p.id)} INDI`, `1 NAME ${gedcomName(p.name)}`);
    lines.push(`1 SEX ${p.gender === 'male' ? 'M' : p.gender === 'female' ? 'F' : 'U'}`);
    if (p.year || p.birthplace) {
      lines.push('1 BIRT');
      if (p.year) lines.push(`2 DATE ${gedcomDate(p.year)}`);
      if (p.birthplace) lines.push(`2 PLAC ${clean(p.birthplace)}`);
    }
    if (p.died) lines.push('1 DEAT', `2 DATE ${gedcomDate(p.died)}`);
    if (p.occupation) lines.push(`1 OCCU ${clean(p.occupation)}`);
    if (p.notes) lines.push(`1 NOTE ${clean(p.notes)}`);
    for (const [k, f] of fams) {
      if (f.children.includes(p.id)) {
        lines.push(`1 FAMC ${famIds.get(k)}`);
        const pedi = pedigree.get(`${p.id}@${k}`);
        if (pedi) lines.push(`2 PEDI ${pedi}`);
      }
      if (f.parents.includes(p.id)) lines.push(`1 FAMS ${famIds.get(k)}`);
    }
  }

  for (const [k, f] of fams) {
    lines.push(`0 ${famIds.get(k)} FAM`);
    const [a, b] = f.parents.map((id) => tree.people[id]);
    // Prefer HUSB/WIFE by gender; fall back to order when genders don't say.
    let husb = a;
    let wife = b;
    if ((a && a.gender === 'female') || (b && b.gender === 'male')) [husb, wife] = [b, a];
    if (husb) lines.push(`1 HUSB ${indi.get(husb.id)}`);
    if (wife) lines.push(`1 WIFE ${indi.get(wife.id)}`);
    for (const c of f.children) lines.push(`1 CHIL ${indi.get(c)}`);
    if (a && b && a.spouses.includes(b.id)) {
      const u = unionOf(tree, a.id, b.id);
      if (
        u.status === 'married' ||
        u.status === 'divorced' ||
        u.status === 'separated' ||
        u.status === 'widowed'
      ) {
        lines.push('1 MARR');
        if (u.start) lines.push(`2 DATE ${gedcomDate(u.start)}`);
      }
      if (u.status === 'divorced') {
        lines.push('1 DIV');
        if (u.end) lines.push(`2 DATE ${gedcomDate(u.end)}`);
      }
    }
  }
  lines.push('0 TRLR');
  return lines.join('\n') + '\n';
}
