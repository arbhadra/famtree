import {
  PARENT_LINKS,
  UNION_STATUSES,
  type Gender,
  type ParentLink,
  type Person,
  type TreeState,
  type UnionStatus,
} from './types';
import { linkType, makePerson, TREE_VERSION, unionKey, unionOf } from './tree';

/* Text export/import of the whole tree as CSV — one row per person — so it can be edited in a
   spreadsheet or text editor and loaded back.

   Columns (header row required, any order, extra columns ignored):
     id          unique id used by the parents/partners columns (any text without ; or :)
     name, gender (male | female | other), born, died, birthplace, occupation, label, notes
     parents     ids separated by ";" — add ":adopted", ":step", ":foster" or ":guardian" when not a birth parent
                 e.g.  p2;p3:adopted
     partners    ids separated by ";" with optional status and years
                 e.g.  p5:divorced:2012:2016;p7:married:2019
     me          "yes" on your own row
*/

export const CSV_COLUMNS = [
  'id',
  'name',
  'gender',
  'born',
  'died',
  'birthplace',
  'occupation',
  'label',
  'notes',
  'parents',
  'partners',
  'me',
] as const;

const NEEDS_QUOTES = /[",\r\n]/;
// Spreadsheet apps run cells starting with these as formulas; prefix them with ' on export.
const FORMULA = /^[=+\-@\t\r]/;

function cell(v: string): string {
  let s = v ?? '';
  if (FORMULA.test(s)) s = "'" + s;
  return NEEDS_QUOTES.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(tree: TreeState): string {
  const rows = [CSV_COLUMNS.join(',')];
  for (const p of Object.values(tree.people)) {
    const parents = p.parents
      .filter((x) => tree.people[x])
      .map((x) => (linkType(p, x) === 'birth' ? x : `${x}:${linkType(p, x)}`))
      .join(';');
    const partners = p.spouses
      .filter((x) => tree.people[x])
      .map((x) => {
        const u = unionOf(tree, p.id, x);
        return [x, u.status, u.start, u.end].join(':').replace(/:+$/, '');
      })
      .join(';');
    const gender = p.gender === 'self' ? 'other' : p.gender;
    rows.push(
      [
        p.id,
        p.name,
        gender,
        p.year,
        p.died,
        p.birthplace,
        p.occupation,
        p.relation,
        p.notes,
        parents,
        partners,
        p.id === tree.meId ? 'yes' : '',
      ]
        .map(cell)
        .join(','),
    );
  }
  // Byte-order mark so Excel opens the file as UTF-8.
  return '\uFEFF' + rows.join('\r\n') + '\r\n';
}

/** RFC 4180 CSV parser: quoted fields, doubled quotes, CR/LF line endings, BOM. */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

export interface CsvImport {
  tree: TreeState;
  warnings: string[];
}

export class CsvError extends Error {}

const unformula = (s: string) => (/^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s);

/** Build a tree from CSV text. Throws CsvError with a readable message when it can't. */
export function fromCsv(text: string, keepPhotosFrom?: TreeState): CsvImport {
  const rows = parseCsvRows(text);
  if (!rows.length) throw new CsvError('The file is empty.');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col('id') < 0 || col('name') < 0)
    throw new CsvError('The first row must be a header with at least "id" and "name" columns.');
  const get = (r: string[], name: string) => {
    const i = col(name);
    return i < 0 ? '' : unformula((r[i] ?? '').trim());
  };

  const warnings: string[] = [];
  const people: Record<string, Person> = {};
  let meId = '';
  const pending: { id: string; line: number; parents: string; partners: string }[] = [];
  rows.slice(1).forEach((r, idx) => {
    const line = idx + 2;
    const id = get(r, 'id');
    if (!id) throw new CsvError(`Row ${line} has no id.`);
    if (/[;:]/.test(id)) throw new CsvError(`Row ${line}: ids can't contain ";" or ":" (${id}).`);
    if (people[id]) throw new CsvError(`Row ${line}: the id "${id}" is used twice.`);
    const g = get(r, 'gender').toLowerCase();
    const gender: Gender =
      g === 'male' || g === 'm' ? 'male' : g === 'female' || g === 'f' ? 'female' : 'other';
    people[id] = makePerson(
      {
        name: get(r, 'name'),
        gender,
        year: get(r, 'born'),
        died: get(r, 'died'),
        birthplace: get(r, 'birthplace'),
        occupation: get(r, 'occupation'),
        relation: get(r, 'label'),
        notes: get(r, 'notes'),
        photo: keepPhotosFrom?.people[id]?.photo ?? null,
      },
      () => id,
    );
    if (/^(yes|y|true|1|x)$/i.test(get(r, 'me'))) {
      if (meId)
        warnings.push(`More than one row is marked "me"; using ${people[meId].name || meId}.`);
      else meId = id;
    }
    pending.push({ id, line, parents: get(r, 'parents'), partners: get(r, 'partners') });
  });
  if (!Object.keys(people).length) throw new CsvError('No people found below the header row.');
  if (!meId) {
    meId = Object.keys(people)[0];
    warnings.push(`No row is marked "me"; using the first person (${people[meId].name || meId}).`);
  }

  const unions: TreeState['unions'] = {};
  const tokens = (s: string) =>
    s
      .split(';')
      .map((t) => t.trim())
      .filter(Boolean);
  for (const { id, line, parents, partners } of pending) {
    const p = people[id];
    for (const tok of tokens(parents)) {
      const [pid, rawType = 'birth'] = tok.split(':').map((x) => x.trim());
      if (!people[pid]) {
        warnings.push(`Row ${line}: parent "${pid}" isn't in the file — skipped.`);
        continue;
      }
      if (pid === id || p.parents.includes(pid)) continue;
      const type = (PARENT_LINKS as readonly string[]).includes(rawType.toLowerCase())
        ? (rawType.toLowerCase() as ParentLink)
        : 'birth';
      if (type !== rawType.toLowerCase())
        warnings.push(`Row ${line}: unknown parent type "${rawType}", treated as birth.`);
      p.parents.push(pid);
      if (type !== 'birth') p.parentTypes[pid] = type;
    }
    for (const tok of tokens(partners)) {
      const [sid, rawStatus = '', start = '', end = ''] = tok.split(':').map((x) => x.trim());
      const s = people[sid];
      if (!s) {
        warnings.push(`Row ${line}: partner "${sid}" isn't in the file — skipped.`);
        continue;
      }
      if (sid === id) continue;
      if (!p.spouses.includes(sid)) p.spouses.push(sid);
      if (!s.spouses.includes(id)) s.spouses.push(id);
      const key = unionKey(id, sid);
      if (unions[key]) continue; // the first row that describes a partnership wins
      const status = (UNION_STATUSES as readonly string[]).includes(rawStatus.toLowerCase())
        ? (rawStatus.toLowerCase() as UnionStatus)
        : 'married';
      if (rawStatus && status !== rawStatus.toLowerCase())
        warnings.push(
          `Row ${line}: unknown partnership status "${rawStatus}", treated as married.`,
        );
      unions[key] = { status, start, end };
    }
  }
  for (const sp of people[meId].spouses) people[sp].side = 'spouse';
  return { tree: { people, meId, unions, version: TREE_VERSION }, warnings };
}
