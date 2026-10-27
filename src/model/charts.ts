import type { ParentLink, TreeState } from './types';
import { byUnionStart, lineageParents, linkType, unionOf } from './tree';
import { yearOf } from './people';

/* Printable chart layouts. Each returns plain geometry (boxes, lines, sectors, rows) so the same
   data renders on screen and exports to PNG/PDF.
   - pedigree:    the focus person on the left, ancestors fanning out to the right
   - descendants: one ancestor at the top, every descendant below, partners beside them
   - fan:         ancestors as rings around the focus person
   - outline:     an indented, document-style list of descendants */

export type ChartKind = 'pedigree' | 'descendants' | 'fan' | 'outline';

export const CHART_LABELS: Record<ChartKind, string> = {
  pedigree: 'Ancestors',
  descendants: 'Descendants',
  fan: 'Fan chart',
  outline: 'Outline',
};

export const CHART_BLURBS: Record<ChartKind, string> = {
  pedigree:
    'A traditional ancestral tree: you on the left, parents, grandparents and beyond to the right.',
  descendants:
    'A descendant tree: one ancestor at the top and every generation that followed, partners alongside.',
  fan: 'A fan chart: generations of ancestors in rings around you — many generations at a glance.',
  outline:
    'A compact vertical tree for documents and reports: each family indented under its parents.',
};

export type LineKind = 'kin' | 'adopted' | 'step' | 'bond' | 'ex';

export interface ChartBox {
  key: string;
  personId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  gen: number;
  role: 'person' | 'focus' | 'partner' | 'empty';
}

export interface ChartLine {
  key: string;
  d: string;
  kind: LineKind;
}

export interface ChartSector {
  key: string;
  personId: string | null;
  gen: number;
  /** Angles in radians, clockwise from the positive x-axis (SVG convention). */
  a0: number;
  a1: number;
  r0: number;
  r1: number;
}

export interface OutlineRow {
  key: string;
  personId: string;
  depth: number;
  x: number;
  y: number;
  partners: { id: string; label: string }[];
}

export interface Chart {
  kind: ChartKind;
  width: number;
  height: number;
  /** Space reserved at the top for the title band. */
  titleH: number;
  boxes: ChartBox[];
  lines: ChartLine[];
  sectors: ChartSector[];
  center?: { x: number; y: number; r: number; personId: string };
  rows: OutlineRow[];
}

export const BOX = { w: 262, h: 76, gapX: 64, gapY: 18, coupleGap: 26, siblingGap: 34 };
export const PAD = 48;
export const TITLE_H = 104;

const kindOf = (t: ParentLink): LineKind =>
  t === 'birth' ? 'kin' : t === 'adopted' ? 'adopted' : 'step';
const empty = (kind: ChartKind): Chart => ({
  kind,
  width: 0,
  height: 0,
  titleH: TITLE_H,
  boxes: [],
  lines: [],
  sectors: [],
  rows: [],
});

/** Lineage parents ordered father-side first (male, then female, then others). */
export function orderedParents(s: TreeState, id: string): [string | null, string | null] {
  const p = s.people[id];
  if (!p) return [null, null];
  const ps = lineageParents(s, p);
  const male = ps.find((x) => s.people[x].gender === 'male');
  const female = ps.find((x) => s.people[x].gender === 'female' && x !== male);
  const rest = ps.filter((x) => x !== male && x !== female);
  const first = male ?? rest.shift() ?? null;
  const second = female ?? rest.shift() ?? null;
  return [first, second];
}

/** Ancestor slots by generation: slots[g][i], with i's parents at 2i (father side) and 2i+1. */
export function ancestorSlots(
  s: TreeState,
  focus: string,
  generations: number,
): (string | null)[][] {
  const slots: (string | null)[][] = [[focus]];
  for (let g = 1; g < generations; g++) {
    const row: (string | null)[] = [];
    for (const id of slots[g - 1]) {
      const [a, b] = id ? orderedParents(s, id) : [null, null];
      row.push(a, b);
    }
    slots.push(row);
  }
  // Drop trailing generations nobody is recorded in (keep at least focus + parents).
  while (slots.length > 2 && slots[slots.length - 1].every((x) => !x)) slots.pop();
  return slots;
}

export function pedigreeChart(s: TreeState, focus: string, generations = 4): Chart {
  if (!s.people[focus]) return empty('pedigree');
  const slots = ancestorSlots(s, focus, generations);
  const G = slots.length;
  const leaves = 2 ** (G - 1);
  const rowH = BOX.h + BOX.gapY;
  const width = PAD * 2 + G * BOX.w + (G - 1) * BOX.gapX;
  const height = TITLE_H + PAD * 2 + leaves * rowH - BOX.gapY;
  const cy = (g: number, i: number) => {
    const span = leaves / 2 ** g;
    return TITLE_H + PAD + (i * span + span / 2) * rowH - BOX.gapY / 2;
  };
  const x = (g: number) => PAD + g * (BOX.w + BOX.gapX);
  const boxes: ChartBox[] = [];
  const lines: ChartLine[] = [];
  slots.forEach((row, g) =>
    row.forEach((id, i) => {
      const child = g > 0 ? slots[g - 1][i >> 1] : 'root';
      if (!id && !child) return; // nobody to be the parent of
      boxes.push({
        key: `${g}-${i}`,
        personId: id,
        x: x(g),
        y: cy(g, i) - BOX.h / 2,
        w: BOX.w,
        h: BOX.h,
        gen: g,
        role: !id ? 'empty' : g === 0 ? 'focus' : 'person',
      });
      if (g > 0 && child) {
        const midX = x(g) - BOX.gapX / 2;
        const kind = id ? kindOf(linkType(s.people[child], id)) : 'kin';
        lines.push({
          key: `l${g}-${i}`,
          kind,
          d: `M ${x(g - 1) + BOX.w} ${cy(g - 1, i >> 1)} H ${midX} V ${cy(g, i)} H ${x(g)}`,
        });
      }
    }),
  );
  return { ...empty('pedigree'), width, height, boxes, lines };
}

/** Topmost ancestor reached by following first (father-side) parents. */
export function topAncestor(s: TreeState, id: string): string {
  const seen = new Set<string>();
  let cur = id;
  for (;;) {
    const [a, b] = orderedParents(s, cur);
    const next = a ?? b;
    if (!next || seen.has(next)) return cur;
    seen.add(cur);
    cur = next;
  }
}

export function descendantChart(s: TreeState, rootId: string, maxDepth = 6): Chart {
  if (!s.people[rootId]) return empty('descendants');
  const birth = (id: string) => yearOf(s.people[id].year) ?? 99999;
  const placed = new Set<string>();
  interface Unit {
    id: string;
    /** Boxes left to right: partners alternate right/left of the person so couples sit together. */
    seq: string[];
    kids: Unit[];
    width: number;
    depth: number;
  }
  const unitWidth = (n: number) => n * BOX.w + (n - 1) * BOX.coupleGap;
  const build = (id: string, depth: number): Unit => {
    placed.add(id);
    const p = s.people[id];
    const partners = p.spouses.filter((x) => s.people[x]).sort(byUnionStart(s, id));
    partners.forEach((x) => placed.add(x));
    const seq = [id];
    partners.forEach((pt, i) => (i % 2 === 0 ? seq.push(pt) : seq.unshift(pt)));
    const kids: Unit[] = [];
    if (depth < maxDepth - 1) {
      // Children grouped by their other parent, ordered left to right like the parents' boxes.
      const slot = (c: (typeof s.people)[string]) => {
        const other = seq.findIndex((x) => x !== id && c.parents.includes(x));
        return other < 0 ? seq.indexOf(id) : other;
      };
      const all = Object.values(s.people)
        .filter((c) => c.parents.includes(id) && !placed.has(c.id))
        .sort((a, b) => slot(a) - slot(b) || birth(a.id) - birth(b.id));
      for (const c of all) if (!placed.has(c.id)) kids.push(build(c.id, depth + 1));
    }
    const kidsW =
      kids.reduce((w, k) => w + k.width, 0) + Math.max(0, kids.length - 1) * BOX.siblingGap;
    return { id, seq, kids, width: Math.max(unitWidth(seq.length), kidsW), depth };
  };
  const root = build(rootId, 0);
  const levelH = BOX.h + 78;
  const boxes: ChartBox[] = [];
  const lines: ChartLine[] = [];
  let maxDepthSeen = 0;
  const place = (u: Unit, left: number) => {
    maxDepthSeen = Math.max(maxDepthSeen, u.depth);
    const uw = unitWidth(u.seq.length);
    const kidsW =
      u.kids.reduce((w, k) => w + k.width, 0) + Math.max(0, u.kids.length - 1) * BOX.siblingGap;
    const unitLeft = left + (u.width - uw) / 2;
    const top = TITLE_H + PAD + u.depth * levelH;
    const boxX = (k: number) => unitLeft + k * (BOX.w + BOX.coupleGap);
    const me = u.seq.indexOf(u.id);
    u.seq.forEach((id, k) =>
      boxes.push({
        key: id === u.id ? `u${id}` : `p${u.id}-${id}`,
        personId: id,
        x: boxX(k),
        y: top,
        w: BOX.w,
        h: BOX.h,
        gen: u.depth,
        role: id === u.id ? (u.depth === 0 ? 'focus' : 'person') : 'partner',
      }),
    );
    // Where each partnership's children hang from.
    const origin = new Map<string, { x: number; y: number }>();
    u.seq.forEach((pt, k) => {
      if (pt === u.id) return;
      const st = unionOf(s, u.id, pt).status;
      const kind = st === 'divorced' || st === 'separated' ? 'ex' : 'bond';
      const [a, b] = k < me ? [k, me] : [me, k];
      if (b - a === 1) {
        lines.push({
          key: `b${u.id}-${pt}`,
          kind,
          d: `M ${boxX(a) + BOX.w} ${top + BOX.h / 2} H ${boxX(b)}`,
        });
        origin.set(pt, { x: boxX(a) + BOX.w + BOX.coupleGap / 2, y: top + BOX.h / 2 });
      } else {
        // Not side by side: a bracket under the boxes in between.
        const y = top + BOX.h + 10;
        const x1 = boxX(a) + BOX.w / 2 + (k < me ? 0 : 20);
        const x2 = boxX(b) + BOX.w / 2 - (k < me ? 20 : 0);
        lines.push({
          key: `b${u.id}-${pt}`,
          kind,
          d: `M ${x1} ${top + BOX.h} V ${y} H ${x2} V ${top + BOX.h}`,
        });
        origin.set(pt, { x: (x1 + x2) / 2, y });
      }
    });
    let x = left + (u.width - kidsW) / 2;
    const kidCenters: { u: Unit; cx: number }[] = [];
    for (const k of u.kids) {
      place(k, x);
      const kLeft = x + (k.width - unitWidth(k.seq.length)) / 2;
      kidCenters.push({
        u: k,
        cx: kLeft + k.seq.indexOf(k.id) * (BOX.w + BOX.coupleGap) + BOX.w / 2,
      });
      x += k.width + BOX.siblingGap;
    }
    // One connector per family (child group sharing the same other parent).
    const groups = new Map<string, typeof kidCenters>();
    for (const kc of kidCenters) {
      const other = u.seq.find((pt) => pt !== u.id && s.people[kc.u.id].parents.includes(pt)) ?? '';
      if (!groups.has(other)) groups.set(other, []);
      groups.get(other)!.push(kc);
    }
    let gi = 0;
    for (const [other, list] of groups) {
      const o = origin.get(other) ?? { x: boxX(me) + BOX.w / 2, y: top + BOX.h };
      const busY = top + levelH - 30 + (gi % 2) * 8;
      const xs = [o.x, ...list.map((l) => l.cx)];
      lines.push({
        key: `t${u.id}-${other}`,
        kind: 'kin',
        d: `M ${o.x} ${o.y} V ${busY} M ${Math.min(...xs)} ${busY} H ${Math.max(...xs)}`,
      });
      for (const l of list) {
        const child = s.people[l.u.id];
        const types = child.parents
          .filter((p) => p === u.id || p === other)
          .map((p) => linkType(child, p));
        const kind = types.includes('adopted')
          ? 'adopted'
          : types.some((t) => t !== 'birth')
            ? 'step'
            : 'kin';
        lines.push({ key: `d${l.u.id}`, kind, d: `M ${l.cx} ${busY} V ${top + levelH}` });
      }
      gi++;
    }
  };
  place(root, PAD);
  const width = root.width + PAD * 2;
  const height = TITLE_H + PAD * 2 + maxDepthSeen * levelH + BOX.h;
  return { ...empty('descendants'), width, height, boxes, lines };
}

export const FAN = { r0: 96, ring: 92, outer: 70 };

export function fanChart(s: TreeState, focus: string, generations = 5): Chart {
  if (!s.people[focus]) return empty('fan');
  const slots = ancestorSlots(s, focus, generations);
  const G = slots.length;
  // Inner rings are wide enough for curved names; the outermost (narrow sectors) use radial text.
  const radius = (g: number) => FAN.r0 + (g - 1) * FAN.ring;
  const R = radius(G);
  const size = R * 2 + PAD * 2;
  const cx = size / 2;
  const cy = TITLE_H + PAD + R;
  const sectors: ChartSector[] = [];
  for (let g = 1; g < G; g++) {
    const n = 2 ** g;
    const step = (Math.PI * 2) / n;
    for (let i = 0; i < n; i++) {
      // Start at the left (π) and go clockwise over the top: father's side above, mother's below.
      const a0 = Math.PI + i * step;
      sectors.push({
        key: `${g}-${i}`,
        personId: slots[g][i],
        gen: g,
        a0,
        a1: a0 + step,
        r0: radius(g),
        r1: radius(g + 1),
      });
    }
  }
  return {
    ...empty('fan'),
    width: size,
    height: size + TITLE_H,
    sectors,
    center: { x: cx, y: cy, r: FAN.r0, personId: focus },
  };
}

export const OUTLINE = { rowH: 46, indent: 44, width: 760 };

export function outlineChart(s: TreeState, rootId: string, maxDepth = 8): Chart {
  if (!s.people[rootId]) return empty('outline');
  const rows: OutlineRow[] = [];
  const lines: ChartLine[] = [];
  const seen = new Set<string>();
  const birth = (id: string) => yearOf(s.people[id].year) ?? 99999;
  const STATUS: Record<string, string> = {
    married: 'm.',
    partner: 'partner',
    engaged: 'engaged',
    separated: 'sep.',
    divorced: 'div.',
    widowed: 'm.',
  };
  let maxIndent = 0;
  const walk = (id: string, depth: number): number => {
    seen.add(id);
    const p = s.people[id];
    const y = TITLE_H + PAD + rows.length * OUTLINE.rowH;
    const x = PAD + depth * OUTLINE.indent;
    maxIndent = Math.max(maxIndent, depth);
    const partners = p.spouses
      .filter((x) => s.people[x])
      .map((x) => {
        seen.add(x);
        const u = unionOf(s, id, x);
        return { id: x, label: [STATUS[u.status], u.start].filter(Boolean).join(' ') };
      });
    rows.push({ key: `r${id}`, personId: id, depth, x, y, partners });
    if (depth >= maxDepth - 1) return y;
    const kids = Object.values(s.people)
      .filter((c) => c.parents.includes(id) && !seen.has(c.id))
      .sort((a, b) => birth(a.id) - birth(b.id));
    let lastY = y;
    for (const k of kids) {
      if (seen.has(k.id)) continue;
      const ky = walk(k.id, depth + 1);
      const kind = kindOf(linkType(k, id));
      lines.push({
        key: `o${k.id}`,
        kind,
        d: `M ${x + 14} ${y + 30} V ${ky + 16} H ${x + OUTLINE.indent - 4}`,
      });
      lastY = Math.max(lastY, ky);
    }
    return y;
  };
  walk(rootId, 0);
  const width = PAD * 2 + maxIndent * OUTLINE.indent + OUTLINE.width;
  const height = TITLE_H + PAD * 2 + rows.length * OUTLINE.rowH;
  return { ...empty('outline'), width, height, rows, lines };
}

export function buildChart(
  s: TreeState,
  kind: ChartKind,
  opts: { focus: string; root: string; generations: number },
): Chart {
  switch (kind) {
    case 'pedigree':
      return pedigreeChart(s, opts.focus, opts.generations);
    case 'fan':
      return fanChart(s, opts.focus, opts.generations);
    case 'descendants':
      return descendantChart(s, opts.root, opts.generations);
    case 'outline':
      return outlineChart(s, opts.root, opts.generations + 2);
  }
}

/** A surname for the chart title: the most common last word among names in the tree. */
export function houseName(s: TreeState, id: string): string {
  const p = s.people[id];
  const own = p?.name.trim().split(/\s+/);
  if (own && own.length > 1) return own[own.length - 1];
  const counts = new Map<string, number>();
  for (const q of Object.values(s.people)) {
    const parts = q.name.trim().split(/\s+/);
    if (parts.length > 1)
      counts.set(parts[parts.length - 1], (counts.get(parts[parts.length - 1]) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}
