import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildTimeline, type TimelineItem } from '../model/timeline';
import { useApp, useTree } from '../store/app';
import { AppHeader } from '../components/AppHeader';
import * as I from '../components/Icons';

const KINDS: { k: TimelineItem['kind']; label: string }[] = [
  { k: 'birth', label: 'Births' },
  { k: 'death', label: 'Passings' },
  { k: 'union', label: 'Marriages' },
  { k: 'entry', label: 'Logbook' },
];

export function TimelinePage() {
  const tree = useTree();
  const entries = useApp((s) => s.entries);
  const [shown, setShown] = useState<Record<string, boolean>>({
    birth: true,
    death: true,
    union: true,
    entry: true,
  });
  const items = useMemo(() => buildTimeline(tree, Object.values(entries)), [tree, entries]);
  const visible = items.filter((i) => shown[i.kind]);

  // Group by decade for year markers.
  const groups: { label: string; items: TimelineItem[] }[] = [];
  for (const it of visible) {
    const label = it.year === null ? 'Undated' : `${Math.floor(it.year / 10) * 10}s`;
    if (groups[groups.length - 1]?.label !== label) groups.push({ label, items: [] });
    groups[groups.length - 1].items.push(it);
  }

  return (
    <div className="page">
      <AppHeader />
      <main className="page-main timeline-page">
        <header className="page-head">
          <div>
            <p className="eyebrow">Through the ages</p>
            <h1>The Timeline of Your House</h1>
            <p className="lead">
              Births, passings and logbook entries, in the order they happened.
            </p>
          </div>
        </header>
        <div className="toolbar" role="group" aria-label="Show">
          {KINDS.map(({ k, label }) => (
            <label key={k} className={`toggle k-${k}`}>
              <input
                type="checkbox"
                checked={shown[k]}
                onChange={(e) => setShown({ ...shown, [k]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="empty-state folio-lite">
            <h2>Nothing on the timeline yet</h2>
            <p>
              Add birth years to people in your tree, or date your logbook entries, and they’ll
              appear here.
            </p>
            <div className="cta-row center">
              <Link className="btn primary" to="/tree">
                Open the tree
              </Link>
              <Link className="btn subtle" to="/logbook">
                Open the logbook
              </Link>
            </div>
          </div>
        ) : (
          <ol className="timeline">
            {groups.map((g) => (
              <li key={g.label} className="decade">
                <h2 className="decade-label">{g.label}</h2>
                <ol>
                  {g.items.map((it) => (
                    <li key={it.key} className={`tl-item k-${it.kind}`}>
                      <span className="tl-year">{it.year ?? '—'}</span>
                      <span className="tl-dot" aria-hidden="true">
                        {it.kind === 'birth' ? (
                          '✿'
                        ) : it.kind === 'death' ? (
                          '✝'
                        ) : it.kind === 'union' ? (
                          '♥'
                        ) : (
                          <I.Book width={13} height={13} />
                        )}
                      </span>
                      <Link
                        className="tl-card"
                        to={it.entryId ? `/logbook/${it.entryId}` : `/tree?focus=${it.personId}`}
                      >
                        <b>{it.title}</b>
                        {it.subtitle && <small>{it.subtitle}</small>}
                      </Link>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}
