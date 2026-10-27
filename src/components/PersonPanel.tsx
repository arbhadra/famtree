import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Gender, LogEntry, Person, TreeState } from '../model/types';
import { genFrom, parentsOf } from '../model/tree';
import { displayName, lifespan, relativesOf } from '../model/people';
import { ENTRY_TYPE_LABELS, formatEntryDate } from '../model/logbook';
import * as I from './Icons';

export type PanelAction = 'father' | 'mother' | 'partner' | 'sibling' | 'child' | 'remove';
export type PanelTab = 'details' | 'relatives' | 'records';

interface Props {
  tree: TreeState;
  person: Person | null;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  /** Focus the name field on open (a relative was just added). */
  autoFocusName: boolean;
  entries: LogEntry[];
  readOnly?: boolean;
  onClose: () => void;
  onEdit?: (id: string, patch: Partial<Person>) => void;
  onAction?: (id: string, action: PanelAction) => void;
  onPickPhoto?: (id: string) => void;
  onJump: (id: string) => void;
  onNewEntry?: (personId: string) => void;
}

export const RELATIONS = [
  'Me',
  'Husband',
  'Wife',
  'Partner',
  'Father',
  'Mother',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandfather',
  'Grandmother',
  'Grandson',
  'Granddaughter',
  'Great-Grandfather',
  'Great-Grandmother',
  'Father-in-law',
  'Mother-in-law',
  'Uncle',
  'Aunt',
  'Cousin',
  'Nephew',
  'Niece',
  'Step-father',
  'Step-mother',
  'Adopted son',
  'Adopted daughter',
  'Foster parent',
  'Guardian',
  'Godparent',
  'Half-brother',
  'Half-sister',
  'Estranged',
  'Abandoned',
  'Unknown',
];

const GENDERS: { v: Gender; label: string }[] = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
  { v: 'other', label: 'Other' },
];

export function PersonPanel(props: Props) {
  const { tree, person: p, tab, onTab, readOnly, onClose } = props;
  const nameRef = useRef<HTMLInputElement>(null);
  const show = !!p;

  useEffect(() => {
    if (p && props.autoFocusName && tab === 'details') {
      const t = setTimeout(() => nameRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [p?.id, props.autoFocusName, tab]); // eslint-disable-line react-hooks/exhaustive-deps

  let body: React.ReactNode = null;
  if (p) {
    const gen = genFrom(tree, p.id);
    const isMe = p.id === tree.meId;
    const genTxt = isMe
      ? 'This is you'
      : gen === 0
        ? 'Same generation'
        : gen < 0
          ? `${-gen} generation${-gen > 1 ? 's' : ''} up`
          : `${gen} generation${gen > 1 ? 's' : ''} down`;
    const sideTxt = isMe ? 'You' : p.side === 'spouse' ? "Partner's side" : 'Your side';
    const rel = relativesOf(tree, p.id);
    const parents = parentsOf(tree, p);
    const hasM = parents.some((x) => x.gender === 'male');
    const hasF = parents.some((x) => x.gender === 'female');
    const records = props.entries;
    const edit = (patch: Partial<Person>) => props.onEdit?.(p.id, patch);

    const act = (a: PanelAction, icon: React.ReactNode, label: string, cls = '') => (
      <button className={`act ${cls}`.trim()} onClick={() => props.onAction?.(p.id, a)}>
        <span className="ic">{icon}</span>
        {label}
      </button>
    );
    const field = (
      id: string,
      label: string,
      key: 'name' | 'relation' | 'year' | 'died' | 'birthplace' | 'occupation',
      placeholder: string,
      extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    ) => (
      <div className="p-field">
        <label htmlFor={id}>{label}</label>
        {readOnly ? (
          <div className="ro">{p[key] || '—'}</div>
        ) : (
          <input
            id={id}
            value={p[key]}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(e) => edit({ [key]: e.target.value })}
            {...extra}
          />
        )}
      </div>
    );
    const relGroup = (label: string, list: Person[]) =>
      list.length > 0 && (
        <div className="rel-group">
          <h5>{label}</h5>
          <div className="chips">
            {list.map((r) => (
              <button
                key={r.id}
                className={`chip side-${r.side}`}
                onClick={() => props.onJump(r.id)}
              >
                {displayName(r)}
                {lifespan(r) && <small>{lifespan(r)}</small>}
              </button>
            ))}
          </div>
        </div>
      );

    body = (
      <>
        <button className="p-close" aria-label="Close" onClick={onClose}>
          <I.X />
        </button>
        <div className="p-head">
          <div
            className={`p-photo${readOnly ? ' ro' : ''}`}
            role={readOnly ? undefined : 'button'}
            tabIndex={readOnly ? undefined : 0}
            aria-label={readOnly ? undefined : 'Change photo'}
            onClick={() => props.onPickPhoto?.(p.id)}
            onKeyDown={(e) => e.key === 'Enter' && props.onPickPhoto?.(p.id)}
          >
            {p.photo ? <img src={p.photo} alt="" /> : <I.User />}
            {!readOnly && (
              <span className="edit">
                <I.Camera width={11} height={11} /> {p.photo ? 'change' : 'add photo'}
              </span>
            )}
          </div>
          <h3 className="p-name">{displayName(p)}</h3>
          {lifespan(p) && <p className="p-life">{lifespan(p)}</p>}
          <div className="p-meta">
            <span className="p-badge">{sideTxt}</span>
            <span className="p-badge">{genTxt}</span>
          </div>
        </div>

        <div className="p-tabs" role="tablist" aria-label="Person sections">
          {(['details', 'relatives', 'records'] as PanelTab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => onTab(t)}>
              {t === 'details'
                ? 'Details'
                : t === 'relatives'
                  ? 'Relatives'
                  : `Records${records.length ? ` · ${records.length}` : ''}`}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="p-fields" role="tabpanel">
            <div className="p-field">
              <label htmlFor="fName">Full name</label>
              {readOnly ? (
                <div className="ro">{p.name || '—'}</div>
              ) : (
                <input
                  id="fName"
                  ref={nameRef}
                  value={p.name}
                  placeholder="e.g. Amala Devi Bhadra"
                  autoComplete="off"
                  onChange={(e) => edit({ name: e.target.value })}
                />
              )}
            </div>
            <div className="p-row">
              {field('fRel', 'Relationship', 'relation', 'e.g. Mother, Guardian', {
                list: 'relations',
              })}
              <div className="p-field">
                <span className="lbl" id="fGenderL">
                  Gender
                </span>
                <div className="seg small" role="radiogroup" aria-labelledby="fGenderL">
                  {GENDERS.map((g) => (
                    <button
                      key={g.v}
                      role="radio"
                      aria-checked={p.gender === g.v || (g.v === 'other' && p.gender === 'self')}
                      disabled={readOnly}
                      onClick={() => edit({ gender: g.v })}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-row">
              {field('fYear', 'Born', 'year', 'e.g. 12 Mar 1958, c. 1900')}
              {field('fDied', 'Died', 'died', 'Leave blank if living')}
            </div>
            {field('fPlace', 'Birthplace', 'birthplace', 'Town, region, country')}
            {field('fOcc', 'Occupation', 'occupation', 'e.g. Schoolteacher, Weaver')}
            <div className="p-field">
              <label htmlFor="fNotes">Notes</label>
              {readOnly ? (
                <div className="ro pre">{p.notes || '—'}</div>
              ) : (
                <textarea
                  id="fNotes"
                  rows={3}
                  value={p.notes}
                  placeholder="Nicknames, traits, a favourite saying…"
                  onChange={(e) => edit({ notes: e.target.value })}
                />
              )}
            </div>
          </div>
        )}

        {tab === 'relatives' && (
          <div role="tabpanel">
            {!readOnly && (
              <div className="p-sec">
                <h4>Add a relative</h4>
                <div className="p-grid">
                  {!hasM && act('father', <I.Parent />, 'Father')}
                  {!hasF && act('mother', <I.Parent />, 'Mother')}
                  {act('partner', <I.Heart />, 'Partner', 'partner')}
                  {act('sibling', <I.Siblings />, 'Sibling')}
                  {act('child', <I.Child />, 'Child', hasM && hasF ? '' : 'full')}
                </div>
              </div>
            )}
            <div className="p-sec">
              <h4>Family</h4>
              {relGroup('Parents', rel.parents)}
              {relGroup('Partners', rel.partners)}
              {relGroup('Siblings', rel.siblings)}
              {relGroup('Children', rel.children)}
              {!rel.parents.length &&
                !rel.partners.length &&
                !rel.siblings.length &&
                !rel.children.length && <p className="empty-note">No relatives recorded yet.</p>}
            </div>
          </div>
        )}

        {tab === 'records' && (
          <div className="p-sec" role="tabpanel">
            <h4>Logbook records</h4>
            {records.length ? (
              <ul className="rec-list">
                {records.map((e) => (
                  <li key={e.id}>
                    <Link to={`/logbook/${e.id}`}>
                      <b>{e.title || 'Untitled entry'}</b>
                      <small>
                        {ENTRY_TYPE_LABELS[e.type]} · {formatEntryDate(e)}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-note">No logbook entries mention {displayName(p)} yet.</p>
            )}
            {props.onNewEntry && (
              <button className="act full" onClick={() => props.onNewEntry?.(p.id)}>
                <span className="ic">
                  <I.Pen />
                </span>
                New entry about {displayName(p)}
              </button>
            )}
          </div>
        )}

        {!readOnly && !isMe && (
          <div className="p-sec p-danger">
            <button className="act danger full" onClick={() => props.onAction?.(p.id, 'remove')}>
              <span className="ic">
                <I.Trash />
              </span>
              Remove this person
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className={`scrim${show ? ' show' : ''}`} onClick={onClose} />
      <div
        id="panel"
        role="dialog"
        aria-label="Person details"
        aria-hidden={!show}
        className={`${p ? 's-' + p.side : ''}${show ? ' show' : ''}`}
      >
        {body}
      </div>
      <datalist id="relations">
        {RELATIONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </datalist>
    </>
  );
}
