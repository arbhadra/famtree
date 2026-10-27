import { useLayoutEffect, useState } from 'react';
import type { TreeState } from '../model/types';
import { parentsOf } from '../model/tree';

interface Path {
  key: string;
  d: string;
  kind: 'bond' | 'kin';
}
interface Heart {
  key: string;
  cx: number;
  cy: number;
}

interface Props {
  tree: TreeState;
  stage: React.RefObject<HTMLDivElement | null>;
  scale: number;
  /** Bumped by the parent when layout may have changed without the tree changing. */
  layoutKey: unknown;
}

/** SVG connectors, measured from the rendered discs so they follow whatever layout CSS produces. */
export function Wires({ tree, stage, scale, layoutKey }: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [paths, setPaths] = useState<Path[]>([]);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useLayoutEffect(() => {
    const compute = () => {
      const st = stage.current;
      if (!st) return;
      const sr = st.getBoundingClientRect();
      const disc = (id: string) => st.querySelector<HTMLElement>(`.disc[data-id="${id}"]`);
      const pos = (e: HTMLElement) => {
        const r = e.getBoundingClientRect();
        const left = (r.left - sr.left) / scale;
        const top = (r.top - sr.top) / scale;
        const w = r.width / scale;
        const h = r.height / scale;
        return { cx: left + w / 2, cy: top + h / 2, top, bottom: top + h, left, right: left + w };
      };

      const nextPaths: Path[] = [];
      const nextHearts: Heart[] = [];
      const drawn = new Set<string>();

      Object.values(tree.people).forEach((p) =>
        p.spouses.forEach((sid) => {
          const key = [p.id, sid].sort().join('-');
          if (drawn.has(key)) return;
          drawn.add(key);
          const a = disc(p.id);
          const b = disc(sid);
          if (!a || !b) return;
          const pa = pos(a);
          const pb = pos(b);
          const [L, R] = pa.cx < pb.cx ? [pa, pb] : [pb, pa];
          const y = (L.cy + R.cy) / 2;
          nextPaths.push({ key: 'b' + key, d: `M ${L.right} ${y} H ${R.left}`, kind: 'bond' });
          nextHearts.push({ key, cx: (L.right + R.left) / 2, cy: y });
        }),
      );

      Object.values(tree.people).forEach((p) => {
        const ec = disc(p.id);
        if (!ec || !p.parents.length) return;
        const pcs = parentsOf(tree, p)
          .map((x) => disc(x.id))
          .filter((x): x is HTMLElement => !!x)
          .map(pos);
        if (!pcs.length) return;
        const pc = pos(ec);
        const sx = pcs.reduce((s, q) => s + q.cx, 0) / pcs.length;
        const sy = Math.max(...pcs.map((q) => q.bottom));
        if (sy >= pc.top - 2) return; // parents not actually above (collapsed)
        const bus = pc.top - Math.min(26, (pc.top - sy) / 2);
        nextPaths.push({
          key: 'k' + p.id,
          d: `M ${sx} ${sy} V ${bus} H ${pc.cx} V ${pc.top}`,
          kind: 'kin',
        });
      });

      setSize({ w: st.scrollWidth, h: st.scrollHeight });
      setPaths(nextPaths);
      setHearts(nextHearts);
    };

    compute();
    const raf = requestAnimationFrame(compute); // once more after fonts/images settle
    window.addEventListener('resize', compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', compute);
    };
  }, [tree, stage, scale, layoutKey]);

  return (
    <svg
      id="wires"
      aria-hidden="true"
      width={size.w}
      height={size.h}
      viewBox={`0 0 ${size.w} ${size.h}`}
    >
      {paths.map((p) => (
        <g key={p.key + p.d}>
          <path
            d={p.d}
            fill="none"
            stroke={p.kind === 'bond' ? 'rgba(207,132,136,.26)' : 'rgba(217,154,78,.24)'}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="wire-draw"
            pathLength={1}
            d={p.d}
            fill="none"
            stroke={p.kind === 'bond' ? '#cf8488' : '#cbb389'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      {hearts.map((h) => {
        const s = 8;
        const d = `M ${h.cx} ${h.cy + s * 0.7} C ${h.cx - s} ${h.cy - s * 0.2}, ${h.cx - s * 0.5} ${h.cy - s}, ${h.cx} ${h.cy - s * 0.35} C ${h.cx + s * 0.5} ${h.cy - s}, ${h.cx + s} ${h.cy - s * 0.2}, ${h.cx} ${h.cy + s * 0.7} Z`;
        return <path key={h.key} d={d} fill="#cf8488" />;
      })}
    </svg>
  );
}
