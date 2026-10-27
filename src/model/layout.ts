import type { ParentLink, TreeState, UnionStatus } from './types';
import { linkType, unionOf } from './tree';
import { yearOf } from './people';

/* A layered "family map" layout: every visible person exactly once.
   1. Generations become layers (parents above children, partners side by side).
   2. Partners form clusters; someone with several partners sits in the middle.
   3. Layers are ordered by repeated barycenter sweeps so children sit under their parents.
   4. X positions are solved per layer with isotonic regression (pool-adjacent-violators),
      pulling each cluster toward its parents/children while keeping minimum gaps. */

export interface LayoutSizes {
  nodeW: number;
  disc: number;
  nodeH: number;
  rowGap: number;
  coupleGap: number;
  siblingGap: number;
  groupGap: number;
  pad: number;
}

export const SIZES: LayoutSizes = {
  nodeW: 156,
  disc: 108,
  nodeH: 178,
  rowGap: 90,
  coupleGap: 56,
  siblingGap: 26,
  groupGap: 60,
  pad: 70,
};

export const SIZES_COMPACT: LayoutSizes = {
  nodeW: 124,
  disc: 88,
  nodeH: 152,
  rowGap: 72,
  coupleGap: 40,
  siblingGap: 18,
  groupGap: 42,
  pad: 44,
};

export interface NodePos {
  id: string;
  /** Top-left of the node box. */
  x: number;
  y: number;
  /** Disc centre. */
  cx: number;
  cy: number;
  layer: number;
}

export interface BondEdge {
  key: string;
  a: string;
  b: string;
  d: string;
  heart: { x: number; y: number };
  status: UnionStatus;
}

export interface KinEdge {
  key: string;
  /** Trunk from the parents down to the bus, and the bus across. */
  d: string;
  drops: { childId: string; d: string; type: ParentLink }[];
}

export interface Layout {
  nodes: Record<string, NodePos>;
  width: number;
  height: number;
  bonds: BondEdge[];
  kin: KinEdge[];
}

interface Cluster {
  layer: number;
  seq: string[];
  left: number;
}

const LINK_RANK: Record<ParentLink, number> = {
  birth: 0,
  adopted: 1,
  step: 2,
  foster: 3,
  guardian: 4,
};
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

export function computeLayout(
  tree: TreeState,
  visible: Set<string>,
  sz: LayoutSizes = SIZES,
): Layout {
  const ids = Object.keys(tree.people).filter((id) => visible.has(id));
  const P = (id: string) => tree.people[id];
  const vis = (id: string) => visible.has(id) && !!tree.people[id];
  const parentsV = (id: string) => P(id).parents.filter(vis);
  const spousesV = (id: string) => P(id).spouses.filter(vis);
  const insertion = new Map(ids.map((id, i) => [id, i]));
  const birthKey = (id: string) => yearOf(P(id).year) ?? 99999;
  const childrenV = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const id of ids) for (const par of parentsV(id)) childrenV.get(par)!.push(id);
  for (const list of childrenV.values())
    list.sort((a, b) => birthKey(a) - birthKey(b) || insertion.get(a)! - insertion.get(b)!);

  /* ---- 1. layers ---- */
  const layer = new Map<string, number>();
  const start = vis(tree.meId) ? tree.meId : ids[0];
  for (const seed of [start, ...ids]) {
    if (!seed || layer.has(seed)) continue;
    layer.set(seed, 0);
    const q = [seed];
    while (q.length) {
      const cur = q.shift()!;
      const l = layer.get(cur)!;
      const nb: [string, number][] = [
        ...parentsV(cur).map((x): [string, number] => [x, l - 1]),
        ...childrenV.get(cur)!.map((x): [string, number] => [x, l + 1]),
        ...spousesV(cur).map((x): [string, number] => [x, l]),
      ];
      for (const [n, nl] of nb) {
        if (!layer.has(n)) {
          layer.set(n, nl);
          q.push(n);
        }
      }
    }
  }
  // Children must sit below every parent (fixes loops such as cousin marriages).
  for (let i = 0, changed = true; changed && i < ids.length; i++) {
    changed = false;
    for (const id of ids)
      for (const par of parentsV(id)) {
        if (layer.get(id)! <= layer.get(par)!) {
          layer.set(id, layer.get(par)! + 1);
          changed = true;
        }
      }
  }

  /* ---- 2. partner clusters ---- */
  const root = new Map(ids.map((id) => [id, id]));
  const find = (x: string): string => {
    while (root.get(x) !== x) x = root.get(x)!;
    return x;
  };
  for (const id of ids)
    for (const sp of spousesV(id))
      if (layer.get(sp) === layer.get(id)) root.set(find(sp), find(id));
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const r = find(id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(id);
  }
  const clusters: Cluster[] = [];
  const clusterOf = new Map<string, Cluster>();
  for (const members of groups.values()) {
    const inCl = new Set(members);
    const partners = (id: string) =>
      spousesV(id)
        .filter((x) => inCl.has(x))
        .sort(
          (a, b) =>
            (yearOf(unionOf(tree, id, a).start) ?? 0) - (yearOf(unionOf(tree, id, b).start) ?? 0),
        );
    const hub = [...members].sort(
      (a, b) =>
        partners(b).length - partners(a).length ||
        Number(b === tree.meId) - Number(a === tree.meId) ||
        Number(P(a).side === 'spouse') - Number(P(b).side === 'spouse') ||
        insertion.get(a)! - insertion.get(b)!,
    )[0];
    const seq = [hub];
    const placed = new Set(seq);
    let right = true;
    for (const p of partners(hub)) {
      if (right) seq.push(p);
      else seq.unshift(p);
      placed.add(p);
      right = !right;
    }
    // Partners of partners extend outward from whichever end they are attached to.
    for (let guard = 0; placed.size < members.length && guard <= members.length; guard++) {
      for (const end of [seq[0], seq[seq.length - 1]]) {
        for (const p of partners(end)) {
          if (placed.has(p)) continue;
          if (end === seq[0]) seq.unshift(p);
          else seq.push(p);
          placed.add(p);
        }
      }
      if (guard === members.length)
        for (const m of members) {
          if (!placed.has(m)) {
            seq.push(m);
            placed.add(m);
          }
        }
    }
    const c: Cluster = { layer: layer.get(hub)!, seq, left: 0 };
    clusters.push(c);
    for (const m of seq) clusterOf.set(m, c);
  }

  /* ---- 3. ordering ---- */
  const layers = new Map<number, Cluster[]>();
  const placedCl = new Set<Cluster>();
  const place = (c: Cluster) => {
    if (placedCl.has(c)) return;
    placedCl.add(c);
    if (!layers.has(c.layer)) layers.set(c.layer, []);
    layers.get(c.layer)!.push(c);
    for (const m of c.seq) for (const k of childrenV.get(m)!) place(clusterOf.get(k)!);
  };
  // Start from my topmost first-parent ancestor so my own line anchors the map.
  let top = start;
  for (let guard = 0; top && parentsV(top).length && guard < ids.length; guard++)
    top = parentsV(top)[0];
  if (top) place(clusterOf.get(top)!);
  const rootsFirst = [...clusters].sort((a, b) => a.layer - b.layer);
  for (const c of rootsFirst) if (!c.seq.some((m) => parentsV(m).length)) place(c);
  for (const c of rootsFirst) place(c);

  const offsetIn = (_c: Cluster, i: number) => i * (sz.nodeW + sz.coupleGap) + sz.nodeW / 2;
  const widthOf = (c: Cluster) => c.seq.length * sz.nodeW + (c.seq.length - 1) * sz.coupleGap;
  const cxOf = (id: string) => {
    const c = clusterOf.get(id)!;
    return c.left + offsetIn(c, c.seq.indexOf(id));
  };
  const center = (c: Cluster) => c.left + widthOf(c) / 2;
  const shareParent = (a: Cluster, b: Cluster) =>
    a.seq.some((x) => b.seq.some((y) => parentsV(x).some((p) => parentsV(y).includes(p))));
  const gapAfter = (row: Cluster[], i: number) =>
    shareParent(row[i], row[i + 1]) ? sz.siblingGap : sz.groupGap;
  const pack = (row: Cluster[]) => {
    let x = 0;
    row.forEach((c, i) => {
      c.left = x;
      x += widthOf(c) + (i < row.length - 1 ? gapAfter(row, i) : 0);
    });
  };
  const layerKeys = [...layers.keys()].sort((a, b) => a - b);
  layerKeys.forEach((l) => pack(layers.get(l)!));

  for (let iter = 0; iter < 8; iter++) {
    const down = iter % 2 === 0;
    const order = down ? layerKeys.slice(1) : layerKeys.slice(0, -1).reverse();
    for (const l of order) {
      const row = layers.get(l)!;
      const key = new Map<Cluster, number>();
      for (const c of row) {
        const rel = (m: string) => (down ? parentsV(m) : childrenV.get(m)!);
        const xs = c.seq.flatMap(rel).map(cxOf);
        key.set(c, xs.length ? mean(xs) : center(c));
        // Orient the cluster so each end sits on the side of its own relatives.
        if (c.seq.length > 1) {
          const ends = [c.seq[0], c.seq[c.seq.length - 1]].map((m) => {
            const r = rel(m).map(cxOf);
            return r.length ? mean(r) : null;
          });
          if (ends[0] !== null && ends[1] !== null && ends[0] > ends[1]) c.seq.reverse();
        }
      }
      row.sort((a, b) => key.get(a)! - key.get(b)!);
      pack(row);
    }
  }

  /* ---- 4. x positions ---- */
  // Family groups: children sharing the same set of visible parents.
  const fam = new Map<string, { parents: string[]; kids: string[] }>();
  for (const id of ids) {
    const ps = parentsV(id).sort();
    if (!ps.length) continue;
    const k = ps.join('+');
    if (!fam.has(k)) fam.set(k, { parents: ps, kids: [] });
    fam.get(k)!.kids.push(id);
  }
  const famList = [...fam.values()];

  for (let iter = 0; iter < 9; iter++) {
    const down = iter % 2 === 0;
    const order = down ? layerKeys.slice(1) : layerKeys.slice(0, -1).reverse();
    for (const l of order) {
      const row = layers.get(l)!;
      const desired: number[] = [];
      const weights: number[] = [];
      for (const c of row) {
        const wants: number[] = [];
        for (const f of famList) {
          if (down) {
            // Pull my members under their parents' midpoint.
            const mine = f.kids.filter((k) => clusterOf.get(k) === c);
            if (!mine.length) continue;
            wants.push(
              mean(f.parents.map(cxOf)) - mean(mine.map((k) => offsetIn(c, c.seq.indexOf(k)))),
            );
          } else {
            // Centre the parents in my cluster over their children.
            const mine = f.parents.filter((p) => clusterOf.get(p) === c);
            if (!mine.length) continue;
            const want =
              mean(f.kids.map(cxOf)) - mean(mine.map((p) => offsetIn(c, c.seq.indexOf(p))));
            for (let i = 0; i < f.kids.length; i++) wants.push(want);
          }
        }
        desired.push(wants.length ? mean(wants) : c.left);
        weights.push(wants.length ? 1 + wants.length : 0.25);
      }
      const lefts = isotonicRow(
        desired,
        row.map(widthOf),
        row.slice(0, -1).map((_, i) => gapAfter(row, i)),
        weights,
      );
      row.forEach((c, i) => (c.left = lefts[i]));
    }
  }

  /* ---- 5. coordinates ---- */
  const minLeft = clusters.length ? Math.min(...clusters.map((c) => c.left)) : 0;
  const maxRight = clusters.length ? Math.max(...clusters.map((c) => c.left + widthOf(c))) : 0;
  const minLayer = layerKeys[0] ?? 0;
  const topOf = (l: number) => sz.pad + (l - minLayer) * (sz.nodeH + sz.rowGap);
  const nodes: Record<string, NodePos> = {};
  for (const c of clusters) {
    c.seq.forEach((id, i) => {
      const x = c.left - minLeft + sz.pad + i * (sz.nodeW + sz.coupleGap);
      const y = topOf(c.layer);
      nodes[id] = { id, x, y, cx: x + sz.nodeW / 2, cy: y + sz.disc / 2, layer: c.layer };
    });
  }
  const width = maxRight - minLeft + sz.pad * 2;
  const height = layerKeys.length
    ? topOf(layerKeys[layerKeys.length - 1]) + sz.nodeH + sz.pad
    : sz.pad * 2;

  /* ---- 6. edges ---- */
  const r = sz.disc / 2;
  const adjacent = (a: string, b: string) => {
    const c = clusterOf.get(a)!;
    return c === clusterOf.get(b) && Math.abs(c.seq.indexOf(a) - c.seq.indexOf(b)) === 1;
  };
  const bonds: BondEdge[] = [];
  const seenBond = new Set<string>();
  for (const a of ids)
    for (const b of spousesV(a)) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seenBond.has(key)) continue;
      seenBond.add(key);
      const A = nodes[a];
      const B = nodes[b];
      const [L, R] = A.cx <= B.cx ? [A, B] : [B, A];
      const status = unionOf(tree, a, b).status;
      if (A.layer !== B.layer) {
        bonds.push({
          key,
          a,
          b,
          status,
          d: `M ${A.cx} ${A.cy} L ${B.cx} ${B.cy}`,
          heart: { x: (A.cx + B.cx) / 2, y: (A.cy + B.cy) / 2 },
        });
      } else if (adjacent(a, b)) {
        bonds.push({
          key,
          a,
          b,
          status,
          d: `M ${L.cx + r} ${L.cy} H ${R.cx - r}`,
          heart: { x: (L.cx + R.cx) / 2, y: L.cy },
        });
      } else {
        // Not side by side: arc over whoever sits between them.
        const y0 = L.y + 2;
        const h = 36 + Math.min(60, (R.cx - L.cx) * 0.08);
        bonds.push({
          key,
          a,
          b,
          status,
          d: `M ${L.cx} ${y0} C ${L.cx} ${y0 - h}, ${R.cx} ${y0 - h}, ${R.cx} ${y0}`,
          heart: { x: (L.cx + R.cx) / 2, y: y0 - h * 0.75 },
        });
      }
    }

  const kin: KinEdge[] = [];
  const byTargetLayer = new Map<
    number,
    { f: (typeof famList)[number]; ox: number; oy: number }[]
  >();
  for (const f of famList) {
    const ps = f.parents.map((p) => nodes[p]);
    let ox: number;
    let oy: number;
    const couple =
      ps.length === 2 &&
      ps[0].layer === ps[1].layer &&
      spousesV(f.parents[0]).includes(f.parents[1]) &&
      adjacent(f.parents[0], f.parents[1]);
    if (couple) {
      ox = (ps[0].cx + ps[1].cx) / 2;
      oy = ps[0].cy;
    } else {
      ox = mean(ps.map((p) => p.cx));
      oy = Math.max(...ps.map((p) => p.y + sz.nodeH - 10));
    }
    const tl = Math.min(...f.kids.map((k) => nodes[k].layer));
    if (!byTargetLayer.has(tl)) byTargetLayer.set(tl, []);
    byTargetLayer.get(tl)!.push({ f, ox, oy });
  }
  for (const [tl, list] of byTargetLayer) {
    list.sort((a, b) => a.ox - b.ox);
    list.forEach(({ f, ox, oy }, i) => {
      const childTop = topOf(tl);
      const stagger = list.length > 1 ? ((i % 3) - 1) * 12 : 0;
      const busY = Math.max(oy + 12, childTop - sz.rowGap / 2 + stagger);
      const xs = [ox, ...f.kids.map((k) => nodes[k].cx)];
      kin.push({
        key: f.parents.join('+'),
        d: `M ${ox} ${oy} V ${busY} M ${Math.min(...xs)} ${busY} H ${Math.max(...xs)}`,
        drops: f.kids.map((k) => {
          const n = nodes[k];
          const type = f.parents
            .map((p) => linkType(P(k), p))
            .sort((a, b) => LINK_RANK[b] - LINK_RANK[a])[0];
          return { childId: k, type, d: `M ${n.cx} ${busY} V ${n.y}` };
        }),
      });
    });
  }

  return { nodes, width, height, bonds, kin };
}

/**
 * Weighted least-squares placement of a row of blocks in fixed order:
 * minimise Σ w·(left − desired)² subject to left[i+1] ≥ left[i] + width[i] + gap[i].
 * Substituting y = left − offset turns the gaps into "y non-decreasing", solved by PAV.
 */
export function isotonicRow(
  desired: number[],
  widths: number[],
  gaps: number[],
  weights: number[],
): number[] {
  const n = desired.length;
  const offset: number[] = [];
  for (let i = 0; i < n; i++)
    offset.push(i === 0 ? 0 : offset[i - 1] + widths[i - 1] + gaps[i - 1]);
  const blocks: { sum: number; w: number; n: number }[] = [];
  for (let i = 0; i < n; i++) {
    blocks.push({ sum: (desired[i] - offset[i]) * weights[i], w: weights[i], n: 1 });
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1];
      const a = blocks[blocks.length - 2];
      if (a.sum / a.w <= b.sum / b.w) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, w: a.w + b.w, n: a.n + b.n });
    }
  }
  const out: number[] = [];
  for (const b of blocks) for (let k = 0; k < b.n; k++) out.push(b.sum / b.w + offset[out.length]);
  return out;
}
