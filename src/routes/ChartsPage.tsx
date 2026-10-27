import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildChart,
  CHART_BLURBS,
  CHART_LABELS,
  houseName,
  topAncestor,
  type ChartKind,
} from '../model/charts';
import { genFrom } from '../model/tree';
import { displayName, yearOf } from '../model/people';
import { kinshipMap, relationLabel } from '../model/kinship';
import { portraitFor, type Portrait } from '../model/age';
import { useTree } from '../store/app';
import { toast } from '../store/toast';
import { downloadPdf, downloadPng, downloadSvg, type PaperSize } from '../lib/exportChart';
import { AppHeader } from '../components/AppHeader';
import { ChartSvg, type ChartTheme } from '../components/ChartSvg';
import * as I from '../components/Icons';

const PREFS = 'ft_chart_prefs';
const KINDS: ChartKind[] = ['pedigree', 'descendants', 'fan', 'outline'];

interface Prefs {
  kind: ChartKind;
  generations: number;
  theme: ChartTheme;
  paper: PaperSize;
  fit: boolean;
}

function loadPrefs(): Prefs {
  const base: Prefs = {
    kind: 'pedigree',
    generations: 4,
    theme: 'parchment',
    paper: 'a4',
    fit: true,
  };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PREFS) || '{}') };
  } catch {
    return base;
  }
}

function KindIcon({ kind }: { kind: ChartKind }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (kind) {
    case 'pedigree':
      return (
        <svg {...common}>
          <rect x="2" y="10" width="6" height="4" rx="1" />
          <rect x="11" y="4" width="5" height="4" rx="1" />
          <rect x="11" y="16" width="5" height="4" rx="1" />
          <path d="M8 12h1.5V6H11M9.5 12v6H11M16 6h2M16 18h2M18 4v4M18 16v4" />
        </svg>
      );
    case 'descendants':
      return (
        <svg {...common}>
          <rect x="9" y="2" width="6" height="4" rx="1" />
          <rect x="2" y="17" width="5" height="4" rx="1" />
          <rect x="9.5" y="17" width="5" height="4" rx="1" />
          <rect x="17" y="17" width="5" height="4" rx="1" />
          <path d="M12 6v5M4.5 17v-3h15v3M12 11v6" />
        </svg>
      );
    case 'fan':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h3M19 12h3M12 2v3M12 19v3M5 5l2.5 2.5M16.5 16.5L19 19" />
        </svg>
      );
    case 'outline':
      return (
        <svg {...common}>
          <circle cx="4" cy="5" r="1.6" />
          <circle cx="9" cy="11" r="1.6" />
          <circle cx="9" cy="18" r="1.6" />
          <path d="M7 5h14M12 11h9M12 18h9M4 7v11h3M4 11h3" />
        </svg>
      );
  }
}

export function ChartsPage() {
  const tree = useTree();
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [focus, setFocus] = useState(tree.meId);
  const [root, setRoot] = useState(() => topAncestor(tree, tree.meId));
  const [busy, setBusy] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      localStorage.setItem(PREFS, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
  };

  const focusId = tree.people[focus] ? focus : tree.meId;
  const rootId = tree.people[root] ? root : topAncestor(tree, tree.meId);
  const computed = useMemo(() => kinshipMap(tree), [tree]);
  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of Object.values(tree.people)) out[p.id] = relationLabel(p, computed);
    return out;
  }, [tree, computed]);
  const portraits = useMemo(() => {
    const meBirth = yearOf(tree.people[tree.meId]?.year);
    const out: Record<string, Portrait> = {};
    for (const p of Object.values(tree.people))
      out[p.id] = portraitFor(p, genFrom(tree, p.id), meBirth);
    return out;
  }, [tree]);
  const maxGen = prefs.kind === 'fan' ? 6 : 7;
  const generations = Math.min(prefs.generations, maxGen);
  const chart = useMemo(
    () => buildChart(tree, prefs.kind, { focus: focusId, root: rootId, generations }),
    [tree, prefs.kind, focusId, rootId, generations],
  );

  const ancestral = prefs.kind === 'pedigree' || prefs.kind === 'fan';
  const subject = tree.people[ancestral ? focusId : rootId];
  const subjectName = displayName(subject, labels[subject.id] || 'Unnamed');
  const house = houseName(tree, subject.id);
  const title = house ? `The House of ${house}` : 'Our Family Tree';
  const subtitle = ancestral ? `Ancestors of ${subjectName}` : `Descendants of ${subjectName}`;
  const fileBase = `${(house || 'family').toLowerCase()}-${prefs.kind}`.replace(
    /[^a-z0-9-]+/g,
    '-',
  );

  const people = Object.values(tree.people).sort((a, b) =>
    displayName(a, labels[a.id]).localeCompare(displayName(b, labels[b.id])),
  );

  const run = async (label: string, job: (svg: SVGSVGElement) => Promise<void>) => {
    if (!svgRef.current) return;
    setBusy(label);
    try {
      await job(svgRef.current);
      toast(`${label} saved`);
    } catch (err) {
      toast(`${label} failed: ${(err as Error).message}`);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="page charts-page">
      <AppHeader />
      <main className="page-main charts-main">
        <header className="page-head no-print">
          <div>
            <p className="eyebrow">Views &amp; prints</p>
            <h1>Family Charts</h1>
            <p className="lead">
              Four classic ways to see your family — each ready to save as an image or print as a
              PDF.
            </p>
          </div>
        </header>

        <div className="chart-kinds no-print" role="radiogroup" aria-label="Chart type">
          {KINDS.map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={prefs.kind === k}
              className="chart-kind"
              onClick={() => update({ kind: k })}
            >
              <KindIcon kind={k} />
              <span>{CHART_LABELS[k]}</span>
            </button>
          ))}
        </div>
        <p className="chart-blurb no-print">{CHART_BLURBS[prefs.kind]}</p>

        <div className="chart-toolbar no-print">
          {ancestral ? (
            <label>
              <span>Centred on</span>
              <select value={focusId} onChange={(e) => setFocus(e.target.value)}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p, labels[p.id] || 'Unnamed')}
                    {labels[p.id] && p.name ? ` (${labels[p.id]})` : ''}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label>
              <span>Starting from</span>
              <select value={rootId} onChange={(e) => setRoot(e.target.value)}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {displayName(p, labels[p.id] || 'Unnamed')}
                    {labels[p.id] && p.name ? ` (${labels[p.id]})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span>Generations</span>
            <select
              value={generations}
              onChange={(e) => update({ generations: Number(e.target.value) })}
            >
              {Array.from({ length: maxGen - 1 }, (_, i) => i + 2).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Style</span>
            <select
              value={prefs.theme}
              onChange={(e) => update({ theme: e.target.value as ChartTheme })}
            >
              <option value="parchment">Parchment (best for printing)</option>
              <option value="royal">Royal night</option>
            </select>
          </label>
          <label className="check-inline">
            <input
              type="checkbox"
              checked={prefs.fit}
              onChange={(e) => update({ fit: e.target.checked })}
            />
            <span>Fit to page width</span>
          </label>
          <div className="chart-exports">
            <button
              className="btn primary"
              disabled={!!busy}
              onClick={() => run('Image', (svg) => downloadPng(svg, `${fileBase}.png`))}
            >
              <I.ImageIcon /> {busy === 'Image' ? 'Saving…' : 'PNG'}
            </button>
            <div className="btn-split">
              <button
                className="btn primary"
                disabled={!!busy}
                onClick={() =>
                  run('PDF', (svg) => downloadPdf(svg, `${fileBase}.pdf`, prefs.paper))
                }
              >
                <I.FileIcon /> {busy === 'PDF' ? 'Saving…' : 'PDF'}
              </button>
              <select
                aria-label="Paper size"
                value={prefs.paper}
                onChange={(e) => update({ paper: e.target.value as PaperSize })}
              >
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">Letter</option>
              </select>
            </div>
            <button
              className="btn subtle"
              disabled={!!busy}
              onClick={() => run('SVG', (svg) => downloadSvg(svg, `${fileBase}.svg`))}
            >
              SVG
            </button>
            <button
              className="btn subtle icon"
              aria-label="Print"
              title="Print"
              onClick={() => window.print()}
            >
              <I.Printer />
            </button>
          </div>
        </div>

        {Object.keys(tree.people).length < 2 && (
          <p className="empty-note center no-print">
            Charts come alive once you add relatives — <Link to="/tree">open your tree</Link>.
          </p>
        )}

        <div className={`chart-stage${prefs.fit ? ' fit' : ''}`}>
          <ChartSvg
            svgRef={svgRef}
            chart={chart}
            tree={tree}
            labels={labels}
            portraits={portraits}
            theme={prefs.theme}
            title={title}
            subtitle={subtitle}
          />
        </div>
      </main>
    </div>
  );
}
