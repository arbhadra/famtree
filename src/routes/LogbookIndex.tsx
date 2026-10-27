import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ENTRY_TYPES, type EntryType, type LogEntry } from '../model/types';
import {
  ENTRY_TYPE_LABELS,
  excerpt,
  filterEntries,
  formatEntryDate,
  newEntry,
  type EntrySort,
} from '../model/logbook';
import { displayName } from '../model/people';
import { useApp, useTree } from '../store/app';
import { useMediaUrl } from '../hooks/useMediaUrl';
import { AppHeader } from '../components/AppHeader';
import { EntryEmblem } from '../components/EntryEmblem';
import * as I from '../components/Icons';

function Card({ e }: { e: LogEntry }) {
  const tree = useTree();
  const cover = e.media.find((m) => m.mime.startsWith('image/'));
  const url = useMediaUrl(cover?.ref);
  return (
    <Link to={`/logbook/${e.id}`} className="entry-card">
      <div className="entry-cover">
        {url ? <img src={url} alt="" loading="lazy" /> : <EntryEmblem type={e.type} />}
      </div>
      <div className="entry-body">
        <p className="entry-meta">
          <span className={`type t-${e.type}`}>{ENTRY_TYPE_LABELS[e.type]}</span>
          <span>{formatEntryDate(e)}</span>
          {e.status === 'draft' && <span className="flag">Draft</span>}
          {e.needsVerification && <span className="flag warn">Verify</span>}
        </p>
        <h3>{e.title || 'Untitled entry'}</h3>
        {e.body && <p className="entry-excerpt">{excerpt(e.body)}</p>}
        {e.people.length > 0 && (
          <p className="entry-people">
            {e.people
              .map((id) => tree.people[id])
              .filter(Boolean)
              .slice(0, 4)
              .map((p) => displayName(p))
              .join(', ')}
            {e.people.length > 4 && ` +${e.people.length - 4}`}
          </p>
        )}
      </div>
    </Link>
  );
}

export function LogbookIndex() {
  const entries = useApp((s) => s.entries);
  const upsertEntry = useApp((s) => s.upsertEntry);
  const tree = useTree();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const type = (params.get('type') as EntryType) || '';
  const personId = params.get('person') || '';
  const sort = (params.get('sort') as EntrySort) || 'date-desc';

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  const list = useMemo(
    () =>
      filterEntries(Object.values(entries), { q, type, personId, sort }, (id) =>
        tree.people[id] ? displayName(tree.people[id]) : '',
      ),
    [entries, q, type, personId, sort, tree],
  );
  const total = Object.keys(entries).length;
  const peopleOptions = Object.values(tree.people)
    .filter((p) => p.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const create = () => {
    const e = newEntry({ people: personId ? [personId] : [], type: type || 'memory' });
    upsertEntry(e);
    navigate(`/logbook/${e.id}?edit=1`);
  };

  return (
    <div className="page">
      <AppHeader />
      <main className="page-main logbook">
        <header className="page-head">
          <div>
            <p className="eyebrow">Volume I</p>
            <h1>The Logbook</h1>
            <p className="lead">
              Every memory, event and document of your house — each with a page of its own.
            </p>
          </div>
          <button className="btn primary big" onClick={create}>
            <I.Pen /> New entry
          </button>
        </header>

        {total > 0 && (
          <div className="toolbar" role="search">
            <label className="search">
              <I.Search width={16} height={16} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search titles, stories, places, people…"
                aria-label="Search the logbook"
              />
            </label>
            <select
              value={type}
              onChange={(e) => setParam('type', e.target.value)}
              aria-label="Filter by type"
            >
              <option value="">All types</option>
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ENTRY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              value={personId}
              onChange={(e) => setParam('person', e.target.value)}
              aria-label="Filter by person"
            >
              <option value="">Everyone</option>
              {peopleOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(e) =>
                setParam('sort', e.target.value === 'date-desc' ? '' : e.target.value)
              }
              aria-label="Sort"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="updated">Recently edited</option>
            </select>
          </div>
        )}

        {total === 0 ? (
          <div className="empty-state folio-lite">
            <EntryEmblem type="story" size={72} />
            <h2>Your logbook awaits its first page</h2>
            <p>
              Record a wedding, a voyage, a recipe handed down, or a letter from long ago. Each
              entry gets a page for the full story, dates, places, people and photographs.
            </p>
            <button className="btn primary big" onClick={create}>
              Write the first entry
            </button>
          </div>
        ) : list.length ? (
          <>
            <p className="count">
              {list.length} of {total} {total === 1 ? 'entry' : 'entries'}
            </p>
            <div className="entry-grid">
              {list.map((e) => (
                <Card key={e.id} e={e} />
              ))}
            </div>
          </>
        ) : (
          <p className="empty-note center">No entries match. Try another search or filter.</p>
        )}
      </main>
    </div>
  );
}
