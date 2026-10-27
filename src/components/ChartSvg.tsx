import type { Ref } from 'react';
import type { Person, TreeState } from '../model/types';
import type { Chart, ChartBox, ChartSector, LineKind } from '../model/charts';
import { CHART_LABELS } from '../model/charts';
import type { Portrait } from '../model/age';
import { displayName, lifespan } from '../model/people';
import { AvatarBody } from './Avatar';

export type ChartTheme = 'royal' | 'parchment';

const THEMES = {
  royal: {
    bg0: '#16244a',
    bg1: '#08112a',
    title: '#f6e7b8',
    sub: '#e3c470',
    box: '#f8f0dc',
    boxStroke: '#c9a24a',
    ink: '#2b1b12',
    inkSoft: '#6a5540',
    line: '#d8b765',
    bond: '#c7607c',
    ex: '#a08690',
    empty: 'rgba(248,240,220,0.18)',
    emptyInk: '#b9ab8a',
    ring: ['#f6e7b8', '#f3dcdf', '#e4ecd8', '#e2e6f3', '#f1e6d0', '#e9e0ee'],
  },
  parchment: {
    bg0: '#fdf9ee',
    bg1: '#f3e9d2',
    title: '#5e1429',
    sub: '#8f6d22',
    box: '#ffffff',
    boxStroke: '#c9a24a',
    ink: '#2b1b12',
    inkSoft: '#6a5540',
    line: '#8f6d22',
    bond: '#8a2441',
    ex: '#9a8a8f',
    empty: 'rgba(143,109,34,0.06)',
    emptyInk: '#a8956f',
    ring: ['#fff6dc', '#f9e4e7', '#e9f1df', '#e5e9f6', '#f6ecd8', '#efe6f3'],
  },
};
/** One accent colour per generation, echoing colour-coded generations in printed trees. */
const GEN = [
  '#8a2441',
  '#22386b',
  '#4d7a4a',
  '#8f6d22',
  '#6a3d7a',
  '#2f6f73',
  '#a0522d',
  '#455a64',
];

const DASH: Record<LineKind, string | undefined> = {
  kin: undefined,
  adopted: '7 5',
  step: '1.5 5',
  bond: undefined,
  ex: '7 6',
};

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s);

interface Props {
  chart: Chart;
  tree: TreeState;
  labels: Record<string, string>;
  portraits: Record<string, Portrait>;
  theme: ChartTheme;
  title: string;
  subtitle: string;
  svgRef?: Ref<SVGSVGElement>;
}

export function ChartSvg({
  chart,
  tree,
  labels,
  portraits,
  theme,
  title,
  subtitle,
  svgRef,
}: Props) {
  const t = THEMES[theme];
  const W = Math.max(chart.width, 640);
  const H = chart.height;
  const offsetX = (W - chart.width) / 2;
  const nameOf = (p: Person) => displayName(p, labels[p.id] || 'Unnamed');

  const face = (p: Person, cx: number, cy: number, r: number, key: string) => (
    <g>
      <clipPath id={`cf-${key}`}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <circle cx={cx} cy={cy} r={r + 2.5} fill={p.died.trim() ? '#8d8577' : t.boxStroke} />
      <circle cx={cx} cy={cy} r={r} fill="#efe2bf" />
      <g clipPath={`url(#cf-${key})`} filter={p.died.trim() ? 'url(#chart-fade)' : undefined}>
        {p.photo ? (
          <image
            href={p.photo}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <svg x={cx - r} y={cy - r} width={r * 2} height={r * 2} viewBox="0 0 100 100">
            <AvatarBody stage={portraits[p.id]?.stage ?? 'adult'} gender={p.gender} />
          </svg>
        )}
      </g>
    </g>
  );

  const box = (b: ChartBox) => {
    const x = b.x + offsetX;
    if (!b.personId)
      return (
        <g key={b.key}>
          <rect
            x={x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx={10}
            fill={t.empty}
            stroke={t.emptyInk}
            strokeDasharray="5 5"
          />
          <text
            x={x + b.w / 2}
            y={b.y + b.h / 2 + 5}
            textAnchor="middle"
            className="c-sub"
            fill={t.emptyInk}
          >
            Not yet recorded
          </text>
        </g>
      );
    const p = tree.people[b.personId];
    if (!p) return null;
    const accent = GEN[b.gen % GEN.length];
    const sub = [labels[p.id], lifespan(p)].filter(Boolean).join(' · ');
    return (
      <g key={b.key}>
        <rect x={x + 2} y={b.y + 4} width={b.w} height={b.h} rx={10} fill="rgba(0,0,0,0.18)" />
        <rect
          x={x}
          y={b.y}
          width={b.w}
          height={b.h}
          rx={10}
          fill={t.box}
          stroke={b.role === 'focus' ? accent : t.boxStroke}
          strokeWidth={b.role === 'focus' ? 2.5 : 1.4}
        />
        <clipPath id={`cb-${b.key}`}>
          <rect x={x} y={b.y} width={b.w} height={b.h} rx={10} />
        </clipPath>
        <rect x={x} y={b.y} width={8} height={b.h} fill={accent} clipPath={`url(#cb-${b.key})`} />
        {face(p, x + 42, b.y + b.h / 2, 25, b.key)}
        <text x={x + 78} y={b.y + 32} className="c-name" fill={t.ink}>
          {clip(nameOf(p), 21)}
        </text>
        <text x={x + 78} y={b.y + 54} className="c-sub" fill={t.inkSoft}>
          {clip(sub, 34)}
        </text>
        {p.birthplace && (
          <text x={x + 78} y={b.y + 70} className="c-tiny" fill={t.inkSoft}>
            {clip(p.birthplace, 36)}
          </text>
        )}
      </g>
    );
  };

  const sectorPath = (s: ChartSector, cx: number, cy: number) => {
    const pt = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    const large = s.a1 - s.a0 > Math.PI ? 1 : 0;
    return `M ${pt(s.r1, s.a0)} A ${s.r1} ${s.r1} 0 ${large} 1 ${pt(s.r1, s.a1)} L ${pt(s.r0, s.a1)} A ${s.r0} ${s.r0} 0 ${large} 0 ${pt(s.r0, s.a0)} Z`;
  };

  const sector = (s: ChartSector) => {
    const c = chart.center!;
    const cx = c.x + offsetX;
    const cy = c.y;
    const p = s.personId ? tree.people[s.personId] : null;
    const mid = (s.a0 + s.a1) / 2;
    const rMid = (s.r0 + s.r1) / 2;
    const fill = p ? t.ring[(s.gen - 1) % t.ring.length] : t.empty;
    const arcLen = rMid * (s.a1 - s.a0);
    let label: React.ReactNode = null;
    if (p) {
      const name = nameOf(p);
      const years = lifespan(p);
      if (arcLen > 120 || s.gen <= 3) {
        // Curved text along the ring, flipped on the lower half so it never reads upside down.
        const lower = Math.sin(mid) > 0.05;
        const r1 = rMid + 6;
        const r2 = rMid - 14;
        const arc = (r: number) => {
          const a = lower ? s.a1 : s.a0;
          const b = lower ? s.a0 : s.a1;
          return `M ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)} A ${r} ${r} 0 0 ${lower ? 0 : 1} ${cx + r * Math.cos(b)} ${cy + r * Math.sin(b)}`;
        };
        const maxChars = Math.max(4, Math.floor((arcLen - 12) / 8.4));
        label = (
          <>
            <path id={`fa-${s.key}`} d={arc(lower ? r2 + 20 : r1)} fill="none" />
            <path id={`fb-${s.key}`} d={arc(lower ? r1 - 20 : r2)} fill="none" />
            <text className="c-fan" fill={t.ink}>
              <textPath href={`#fa-${s.key}`} startOffset="50%" textAnchor="middle">
                {clip(name, maxChars)}
              </textPath>
            </text>
            {years && (
              <text className="c-fan-sub" fill={t.inkSoft}>
                <textPath href={`#fb-${s.key}`} startOffset="50%" textAnchor="middle">
                  {years}
                </textPath>
              </text>
            )}
          </>
        );
      } else {
        // Narrow outer sectors: text runs along the radius.
        const deg = (mid * 180) / Math.PI;
        const left = Math.cos(mid) < 0;
        const x = cx + rMid * Math.cos(mid);
        const y = cy + rMid * Math.sin(mid);
        label = (
          <text
            transform={`translate(${x} ${y}) rotate(${left ? deg + 180 : deg})`}
            textAnchor="middle"
            className="c-fan-sm"
            fill={t.ink}
          >
            <tspan x={0} dy={-2}>
              {clip(name, Math.floor((s.r1 - s.r0 - 8) / 6.6))}
            </tspan>
            {years && (
              <tspan x={0} dy={13} className="c-fan-sub">
                {years}
              </tspan>
            )}
          </text>
        );
      }
    }
    return (
      <g key={s.key}>
        <path d={sectorPath(s, cx, cy)} fill={fill} stroke={t.boxStroke} strokeWidth={1.2} />
        {label}
      </g>
    );
  };

  const center = () => {
    const c = chart.center!;
    const p = tree.people[c.personId];
    const cx = c.x + offsetX;
    return (
      <g>
        <circle cx={cx} cy={c.y} r={c.r} fill={t.box} stroke={GEN[0]} strokeWidth={3} />
        {face(p, cx, c.y - 22, 34, 'center')}
        <text x={cx} y={c.y + 34} textAnchor="middle" className="c-name" fill={t.ink}>
          {clip(nameOf(p), 16)}
        </text>
        <text x={cx} y={c.y + 54} textAnchor="middle" className="c-sub" fill={t.inkSoft}>
          {lifespan(p)}
        </text>
      </g>
    );
  };

  const row = (r: Chart['rows'][number]) => {
    const p = tree.people[r.personId];
    const x = r.x + offsetX;
    const accent = GEN[r.depth % GEN.length];
    const partners = r.partners
      .map((pt) => tree.people[pt.id])
      .filter(Boolean)
      .map((q, i) => `${nameOf(q)}${r.partners[i].label ? ` (${r.partners[i].label})` : ''}`);
    return (
      <g key={r.key}>
        {face(p, x + 14, r.y + 16, 14, r.key)}
        <rect x={x + 34} y={r.y + 4} width={3} height={24} fill={accent} rx={1.5} />
        <text x={x + 44} y={r.y + 22} fill={t.ink}>
          <tspan className="c-name-sm">{nameOf(p)}</tspan>
          <tspan className="c-sub" fill={t.inkSoft} dx={10}>
            {[lifespan(p), labels[p.id]].filter(Boolean).join(' · ')}
          </tspan>
          {partners.length > 0 && (
            <tspan className="c-sub" fill={t.bond} dx={12}>
              ♥ {clip(partners.join(', '), 70)}
            </tspan>
          )}
        </text>
      </g>
    );
  };

  const lineColour = (k: LineKind) => (k === 'bond' ? t.bond : k === 'ex' ? t.ex : t.line);
  const stamp = new Date().toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      className={`chart-svg theme-${theme}`}
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`${CHART_LABELS[chart.kind]}: ${title}`}
    >
      <defs>
        <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.bg0} />
          <stop offset="1" stopColor={t.bg1} />
        </linearGradient>
        <filter id="chart-fade">
          <feColorMatrix type="saturate" values="0.15" />
        </filter>
        <style>{`
          .c-title { font-family: Cinzel, 'Trajan Pro', Georgia, serif; font-weight: 700; font-size: 30px; letter-spacing: 3px; }
          .c-subtitle, .c-sub, .c-fan-sub, .c-tiny, .c-foot { font-family: 'Cormorant Garamond', Georgia, serif; font-style: italic; }
          .c-subtitle { font-size: 18px; }
          .c-name { font-family: Cinzel, Georgia, serif; font-weight: 700; font-size: 14.5px; letter-spacing: 0.4px; }
          .c-name-sm { font-family: Cinzel, Georgia, serif; font-weight: 700; font-size: 14px; }
          .c-sub { font-size: 15px; }
          .c-tiny { font-size: 12.5px; }
          .c-fan { font-family: Cinzel, Georgia, serif; font-weight: 700; font-size: 13px; }
          .c-fan-sm { font-family: Cinzel, Georgia, serif; font-weight: 700; font-size: 11px; }
          .c-fan-sub { font-size: 12.5px; }
          .c-foot { font-size: 12px; }
        `}</style>
      </defs>
      <rect width={W} height={H} fill="url(#chart-bg)" />
      <rect
        x={10}
        y={10}
        width={W - 20}
        height={H - 20}
        rx={8}
        fill="none"
        stroke={t.boxStroke}
        strokeWidth={1.5}
        opacity={0.8}
      />
      <rect
        x={16}
        y={16}
        width={W - 32}
        height={H - 32}
        rx={6}
        fill="none"
        stroke={t.boxStroke}
        strokeWidth={0.6}
        opacity={0.6}
      />
      <text x={W / 2} y={56} textAnchor="middle" className="c-title" fill={t.title}>
        {title}
      </text>
      <text x={W / 2} y={84} textAnchor="middle" className="c-subtitle" fill={t.sub}>
        {subtitle}
      </text>
      <path
        d={`M ${W / 2 - 110} 96 H ${W / 2 - 10} M ${W / 2 + 10} 96 H ${W / 2 + 110}`}
        stroke={t.sub}
        strokeWidth={1}
      />
      <circle cx={W / 2} cy={96} r={3} fill={t.sub} />

      <g transform={`translate(${offsetX} 0)`}>
        {chart.lines.map((l) => (
          <path
            key={l.key}
            d={l.d}
            fill="none"
            stroke={lineColour(l.kind)}
            strokeWidth={l.kind === 'step' ? 2.4 : 1.8}
            strokeDasharray={DASH[l.kind]}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
      {chart.sectors.map(sector)}
      {chart.center && center()}
      {chart.boxes.map(box)}
      {chart.rows.map(row)}
      {chart.kind === 'outline' && chart.rows.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" className="c-sub" fill={t.sub}>
          Nobody to show yet.
        </text>
      )}
      <text x={W - 26} y={H - 22} textAnchor="end" className="c-foot" fill={t.sub}>
        {CHART_LABELS[chart.kind]} · {stamp} · Family Tree
      </text>
      <title>{`${title} — ${subtitle}`}</title>
    </svg>
  );
}
