import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DATE_QUALIFIERS, ENTRY_TYPES, type LogEntry, type MediaItem } from '../model/types';
import {
  ENTRY_TYPE_LABELS,
  QUALIFIER_LABELS,
  entryId,
  formatEntryDate,
  isValidPartialDate,
} from '../model/logbook';
import { displayName } from '../model/people';
import { useApp, useTree } from '../store/app';
import { toast } from '../store/toast';
import { compressImage, pickFile } from '../lib/media';
import { AppHeader } from '../components/AppHeader';
import { RichEditor } from '../components/RichEditor';
import { StoryView } from '../components/StoryView';
import { PeoplePicker } from '../components/PeoplePicker';
import { MediaGallery } from '../components/MediaGallery';
import { EntryEmblem } from '../components/EntryEmblem';
import * as I from '../components/Icons';

const openPages = new Map<string, number>();

const isBlank = (e: LogEntry) =>
  !e.title.trim() && !e.body && !e.media.length && !e.place.trim() && !e.sources.trim() && !e.date;

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export function LogEntryPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const entry = useApp((s) => s.entries[id]);
  const ready = useApp((s) => s.ready);
  const repo = useApp((s) => s.repo);
  const saveState = useApp((s) => s.saveState);
  const { upsertEntry, deleteEntry } = useApp.getState();
  const tree = useTree();
  const [editing, setEditing] = useState(
    params.get('edit') === '1' || (entry ? isBlank(entry) : false),
  );
  const [uploading, setUploading] = useState(0);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get('edit')) setParams({}, { replace: true });
    if (editing && entry && !entry.title) setTimeout(() => titleRef.current?.focus(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Discard an entry abandoned before anything was written. Deferred so a StrictMode
  // remount (or navigating straight back) doesn't delete the page that is still open.
  useEffect(() => {
    openPages.set(id, (openPages.get(id) ?? 0) + 1);
    return () => {
      openPages.set(id, (openPages.get(id) ?? 1) - 1);
      setTimeout(() => {
        const e = useApp.getState().entries[id];
        if (!openPages.get(id) && e && isBlank(e)) void useApp.getState().deleteEntry(id);
      }, 0);
    };
  }, [id]);

  if (!entry) {
    return (
      <div className="page">
        <AppHeader />
        <main className="page-main">
          {ready && (
            <div className="empty-state folio-lite">
              <h2>This page isn’t in your logbook</h2>
              <p>It may have been deleted, or it belongs to a different account.</p>
              <Link className="btn primary" to="/logbook">
                Back to the logbook
              </Link>
            </div>
          )}
        </main>
      </div>
    );
  }

  const set = (patch: Partial<LogEntry>) => upsertEntry({ ...entry, ...patch });
  const dateOk = isValidPartialDate(entry.date);
  const endOk = isValidPartialDate(entry.dateEnd);

  const addMedia = async () => {
    const files = await pickFile('image/*,application/pdf', true);
    if (!files.length) return;
    setUploading((n) => n + files.length);
    const added: MediaItem[] = [];
    for (const f of files) {
      try {
        const blob =
          f.type.startsWith('image/') && f.type !== 'image/gif' ? await compressImage(f) : f;
        const name = f.type.startsWith('image/') ? f.name.replace(/\.\w+$/, '') + '.jpg' : f.name;
        const ref = await repo.uploadMedia(blob, name);
        added.push({ id: entryId(), name: f.name, mime: blob.type || f.type, caption: '', ref });
      } catch (err) {
        toast(`${f.name}: ${(err as Error).message}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    // Re-read: the entry may have changed while uploading.
    const latest = useApp.getState().entries[id];
    if (latest && added.length) upsertEntry({ ...latest, media: [...latest.media, ...added] });
  };

  const removeMedia = (m: MediaItem) => {
    if (!confirm(`Remove “${m.name}” from this entry?`)) return;
    set({ media: entry.media.filter((x) => x.id !== m.id) });
    void repo.deleteMedia(m.ref).catch(() => {});
  };

  const remove = async () => {
    if (!confirm(`Delete “${entry.title || 'this entry'}”? This cannot be undone.`)) return;
    await deleteEntry(id);
    toast('Entry deleted');
    navigate('/logbook');
  };

  const people = entry.people.map((pid) => tree.people[pid]).filter(Boolean);

  return (
    <div className="page">
      <AppHeader />
      <main className="page-main entry-page">
        <div className="entry-bar no-print">
          <Link to="/logbook" className="btn subtle">
            <I.ArrowLeft /> <span className="lbl">Logbook</span>
          </Link>
          <span className={`save-pill s-${saveState}`}>
            {saveState === 'saving'
              ? 'Saving…'
              : saveState === 'error'
                ? 'Not saved'
                : 'All changes saved'}
          </span>
          <div className="entry-actions">
            <button
              className="btn subtle"
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
            >
              {editing ? <I.Eye /> : <I.Pen />}
              <span className="lbl">{editing ? 'Read' : 'Edit'}</span>
            </button>
            <button
              className="btn subtle icon"
              onClick={() => window.print()}
              aria-label="Print or save as PDF"
              title="Print or save as PDF"
            >
              <I.Printer />
            </button>
            <button
              className="btn subtle icon danger"
              onClick={remove}
              aria-label="Delete entry"
              title="Delete entry"
            >
              <I.Trash />
            </button>
          </div>
        </div>

        <article className="manuscript">
          {editing ? (
            <div className="entry-form">
              <input
                ref={titleRef}
                className="title-input"
                value={entry.title}
                placeholder="Give this page a title…"
                aria-label="Title"
                onChange={(e) => set({ title: e.target.value })}
              />

              <div className="form-grid">
                <label className="field">
                  <span>Type</span>
                  <select
                    value={entry.type}
                    onChange={(e) => set({ type: e.target.value as LogEntry['type'] })}
                  >
                    {ENTRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ENTRY_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Place</span>
                  <input
                    value={entry.place}
                    placeholder="Where did it happen?"
                    onChange={(e) => set({ place: e.target.value })}
                  />
                </label>
                <div className="field date-field">
                  <span id="dateL">When</span>
                  <div className="date-row" role="group" aria-labelledby="dateL">
                    <select
                      value={entry.dateQualifier}
                      aria-label="Date precision"
                      onChange={(e) =>
                        set({ dateQualifier: e.target.value as LogEntry['dateQualifier'] })
                      }
                    >
                      {DATE_QUALIFIERS.map((q) => (
                        <option key={q} value={q}>
                          {QUALIFIER_LABELS[q]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={entry.date}
                      placeholder="YYYY-MM-DD"
                      aria-label="Date"
                      aria-invalid={!dateOk}
                      inputMode="numeric"
                      onChange={(e) => set({ date: e.target.value.trim() })}
                    />
                    {entry.dateQualifier === 'between' && (
                      <>
                        <span className="and">and</span>
                        <input
                          value={entry.dateEnd}
                          placeholder="YYYY-MM-DD"
                          aria-label="End date"
                          aria-invalid={!endOk}
                          inputMode="numeric"
                          onChange={(e) => set({ dateEnd: e.target.value.trim() })}
                        />
                      </>
                    )}
                  </div>
                  <small className={dateOk && endOk ? '' : 'err'}>
                    {dateOk && endOk
                      ? entry.date
                        ? `Reads as: ${formatEntryDate(entry)}`
                        : 'Year only is fine — e.g. 1962 or 1962-04'
                      : 'Use YYYY, YYYY-MM or YYYY-MM-DD'}
                  </small>
                </div>
                <div className="field">
                  <span>Status</span>
                  <div className="seg small" role="radiogroup" aria-label="Status">
                    {(['draft', 'complete'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={entry.status === s}
                        onClick={() => set({ status: s })}
                      >
                        {s === 'draft' ? 'Draft' : 'Complete'}
                      </button>
                    ))}
                  </div>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={entry.needsVerification}
                      onChange={(e) => set({ needsVerification: e.target.checked })}
                    />
                    Needs verification
                  </label>
                </div>
              </div>

              <div className="field">
                <span>People in this entry</span>
                <PeoplePicker
                  tree={tree}
                  value={entry.people}
                  onChange={(people) => set({ people })}
                />
              </div>

              <div className="field">
                <span>The story</span>
                <RichEditor
                  value={entry.body}
                  onChange={(body) => set({ body })}
                  placeholder="Tell the story — who was there, what happened, what it meant…"
                />
              </div>

              <div className="field">
                <span>Photographs &amp; documents</span>
                <MediaGallery
                  media={entry.media}
                  editing
                  onChange={(media) => set({ media })}
                  onRemove={removeMedia}
                />
                <button
                  type="button"
                  className="btn subtle add-media"
                  onClick={addMedia}
                  disabled={uploading > 0}
                >
                  <I.ImageIcon /> {uploading ? `Uploading ${uploading}…` : 'Add photos or PDFs'}
                </button>
              </div>

              <label className="field">
                <span>Sources &amp; notes</span>
                <textarea
                  rows={3}
                  value={entry.sources}
                  placeholder="Where this came from — a letter, a certificate, Grandma’s telling in 1998…"
                  onChange={(e) => set({ sources: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="entry-read">
              <div className="read-head">
                <EntryEmblem type={entry.type} size={64} />
                <p className="entry-meta">
                  <span className={`type t-${entry.type}`}>{ENTRY_TYPE_LABELS[entry.type]}</span>
                  <span>{formatEntryDate(entry)}</span>
                  {entry.place && <span>{entry.place}</span>}
                </p>
                <h1>{entry.title || 'Untitled entry'}</h1>
                <div className="flourish" aria-hidden="true" />
                {(entry.status === 'draft' || entry.needsVerification) && (
                  <p className="flags">
                    {entry.status === 'draft' && <span className="flag">Draft</span>}
                    {entry.needsVerification && (
                      <span className="flag warn">Needs verification</span>
                    )}
                  </p>
                )}
              </div>
              {people.length > 0 && (
                <div className="read-people">
                  {people.map((p) => (
                    <Link key={p.id} to={`/tree?focus=${p.id}`} className={`chip side-${p.side}`}>
                      {displayName(p)}
                    </Link>
                  ))}
                </div>
              )}
              {entry.body ? (
                <StoryView html={entry.body} />
              ) : (
                <p className="empty-note center">
                  No story written yet.{' '}
                  <button className="linkish" onClick={() => setEditing(true)}>
                    Write it now
                  </button>
                </p>
              )}
              <MediaGallery media={entry.media} editing={false} />
              {entry.sources && (
                <section className="sources">
                  <h4>Sources &amp; notes</h4>
                  <p className="pre">{entry.sources}</p>
                </section>
              )}
            </div>
          )}
          <footer className="stamp">
            Recorded {fmtStamp(entry.createdAt)} · last edited {fmtStamp(entry.updatedAt)}
          </footer>
        </article>
      </main>
    </div>
  );
}
