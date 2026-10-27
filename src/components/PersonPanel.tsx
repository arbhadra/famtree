import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  PARENT_LINKS,
  UNION_STATUSES,
  type Gender,
  type LogEntry,
  type ParentLink,
  type Person,
  type TreeState,
  type Union,
} from '../model/types';
import { genFrom, lineageParents, linkType, unionOf } from '../model/tree';
import { displayName, lifespan } from '../model/people';
import { ENTRY_TYPE_LABELS, formatEntryDate } from '../model/logbook';
import type { Portrait } from '../model/age';
import { PersonPortrait } from './PersonPortrait';
import * as I from './Icons';

export type PanelTab = 'details' | 'relatives' | 'records';

export type Relate =
  | { kind: 'parent'; gender: Gender; type: ParentLink }
  | { kind: 'partner'; gender: Gender }
  | { kind: 'child'; withId: string | null; gender: Gender }
  | { kind: 'sibling'; gender: Gender; via: 'full' | string }
  | { kind: 'remove' };

interface Props {
  tree: TreeState;
  person: Person | null;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  /** Focus the name field on open (a relative was just added). */
  autoFocusName: boolean;
  entries: LogEntry[];
  labels: Record<string, string>;
  computed: Record<string, string>;
  portraits: Record<string, Portrait>;
  readOnly?: boolean;
  onClose: () => void;
  onEdit?: (id: string, patch: Partial<Person>) => void;
  /** Add a relative to `targetId` (usually the open person; a parent when adding a step-parent). */
  onRelate?: (targetId: string, r: Relate) => void;
  onUnion?: (a: string, b: string, patch: Partial<Union>) => void;
  onParentLink?: (childId: string, parentId: string, type: ParentLink) => void;
  onPickPhoto?: (id: string) => void;
  onJump: (id: string) => void;
  onNewEntry?: (personId: string) => void;
}

const GENDERS: { v: Gender; label: string }[] = [
  { v: 'male', label: 'Male' },
  { v: 'female', label: 'Female' },
  { v: 'other', label: 'Other' },
];

export const LINK_LABELS: Record<ParentLink, string> = {
  birth: 'Birth',
  adopted: 'Adoptive',
  step: 'Step',
  foster: 'Foster',
  guardian: 'Guardian',
};

export const STATUS_LABELS: Record<Union['status'], string> = {
  married: 'Married',
  partner: 'Partners',
  engaged: 'Engaged',
  separated: 'Separated',
  divorced: 'Divorced',
  widowed: 'Widowed',
};

const first = (p: Person, fallback: string) => p.name.trim().split(/\s+/)[0] || fallback;

export function PersonPanel(props: Props) {
  const { tree, person: p, tab, onTab, readOnly, onClose, labels, computed } = props;
  const nameRef = useRef<HTMLInputElement>(null);
  const [extraParentType, setExtraParentType] = useState<ParentLink>('adopted');
  const [siblingVia, setSiblingVia] = useState<string>('full');
  const show = !!p;

  useEffect(() => {
    if (p && props.autoFocusName && tab === 'details') {
      // Focus on the next frame so typing straight after "Add" isn't lost.
      const f = requestAnimationFrame(() => nameRef.current?.focus({ preventScroll: true }));
      return () => cancelAnimationFrame(f);
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
    const edit = (patch: Partial<Person>) => props.onEdit?.(p.id, patch);
    const relate = (r: Relate, target = p.id) => props.onRelate?.(target, r);
    const records = props.entries;
    const person = (id: string) => tree.people[id];
    const nameOf = (x: Person) => displayName(x, labels[x.id] || 'Unnamed');

    const parents = p.parents.map(person).filter(Boolean);
    const birthParents = parents.filter((x) => linkType(p, x.id) === 'birth');
    const hasBirthFather = birthParents.some((x) => x.gender === 'male');
    const hasBirthMother = birthParents.some((x) => x.gender === 'female');
    const partners = p.spouses.map(person).filter(Boolean);
    const children = Object.values(tree.people).filter((c) => c.parents.includes(p.id));
    // Group children by their other parent (a partner, someone else, or nobody recorded).
    const kidsWith = (otherId: string | null) =>
      children.filter((c) => {
        const others = c.parents.filter((x) => x !== p.id && tree.people[x]);
        return otherId ? others.includes(otherId) : others.length === 0;
      });
    const otherCoParents = [
      ...new Set(
        children.flatMap((c) =>
          c.parents.filter((x) => x !== p.id && tree.people[x] && !p.spouses.includes(x)),
        ),
      ),
    ];
    const myLineage = lineageParents(tree, p);
    const siblings = Object.values(tree.people).filter(
      (s) => s.id !== p.id && s.parents.some((x) => p.parents.includes(x)),
    );
    const fullSibs = siblings.filter((s) => {
      const sl = lineageParents(tree, s);
      return (
        myLineage.length > 0 &&
        myLineage.every((x) => sl.includes(x)) &&
        sl.length === myLineage.length
      );
    });
    const halfSibs = siblings.filter((s) => !fullSibs.includes(s));

    const chip = (r: Person) => (
      <button key={r.id} className={`chip side-${r.side}`} onClick={() => props.onJump(r.id)}>
        <span className="chip-face">
          <PersonPortrait person={r} portrait={props.portraits[r.id]} />
        </span>
        <span className="chip-text">
          {nameOf(r)}
          <small>{[labels[r.id], lifespan(r)].filter(Boolean).join(' · ')}</small>
        </span>
      </button>
    );
    const addBtn = (label: string, onClick: () => void, title?: string) => (
      <button className="mini-add" type="button" onClick={onClick} title={title}>
        <I.Plus width={11} height={11} /> {label}
      </button>
    );
    const kidButtons = (withId: string | null) =>
      !readOnly && (
        <div className="mini-row">
          {addBtn('Son', () => relate({ kind: 'child', withId, gender: 'male' }))}
          {addBtn('Daughter', () => relate({ kind: 'child', withId, gender: 'female' }))}
          {addBtn(
            'Child',
            () => relate({ kind: 'child', withId, gender: 'other' }),
            'Gender not specified',
          )}
        </div>
      );
    const field = (
      id: string,
      label: string,
      key: 'year' | 'died' | 'birthplace' | 'occupation',
      placeholder: string,
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
          />
        )}
      </div>
    );

    body = (
      <>
        <button className="p-close" aria-label="Close" onClick={onClose}>
          <I.X />
        </button>
        <div className="p-head">
          <div
            className={`p-photo${readOnly ? ' ro' : ''}${p.died.trim() ? ' deceased' : ''}`}
            role={readOnly ? undefined : 'button'}
            tabIndex={readOnly ? undefined : 0}
            aria-label={readOnly ? undefined : 'Change photo'}
            onClick={() => props.onPickPhoto?.(p.id)}
            onKeyDown={(e) => e.key === 'Enter' && props.onPickPhoto?.(p.id)}
          >
            <PersonPortrait person={p} portrait={props.portraits[p.id]} />
            {!readOnly && (
              <span className="edit">
                <I.Camera width={11} height={11} /> {p.photo ? 'change' : 'add photo'}
              </span>
            )}
          </div>
          <h3 className="p-name">{nameOf(p)}</h3>
          {lifespan(p) && <p className="p-life">{lifespan(p)}</p>}
          <div className="p-meta">
            {labels[p.id] && <span className="p-badge strong">{labels[p.id]}</span>}
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
            <div className="p-row">
              {field('fYear', 'Born', 'year', 'e.g. 12 Mar 1958, c. 1900')}
              {field('fDied', 'Died', 'died', 'Leave blank if living')}
            </div>
            {field('fPlace', 'Birthplace', 'birthplace', 'Town, region, country')}
            {field('fOcc', 'Occupation', 'occupation', 'e.g. Schoolteacher, Weaver')}
            {!isMe && (
              <div className="p-field">
                <label htmlFor="fRel">Relationship label</label>
                {readOnly ? (
                  <div className="ro">{labels[p.id] || '—'}</div>
                ) : (
                  <>
                    <input
                      id="fRel"
                      value={p.relation}
                      placeholder={computed[p.id] || 'e.g. Godmother'}
                      autoComplete="off"
                      onChange={(e) => edit({ relation: e.target.value })}
                    />
                    <small className="hint">
                      Worked out as “{computed[p.id] || '—'}”. Type to use your own word, like Nani
                      or Godfather.
                    </small>
                  </>
                )}
              </div>
            )}
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
          <div role="tabpanel" className="rel-tab">
            {/* ---------------- parents ---------------- */}
            <section className="p-sec">
              <h4>Parents</h4>
              {parents.map((par) => (
                <div key={par.id} className="rel-card">
                  {chip(par)}
                  <div className="rel-controls">
                    {readOnly ? (
                      <span className="tag">{LINK_LABELS[linkType(p, par.id)]}</span>
                    ) : (
                      <select
                        aria-label={`How ${nameOf(p)} is linked to ${nameOf(par)}`}
                        value={linkType(p, par.id)}
                        onChange={(e) =>
                          props.onParentLink?.(p.id, par.id, e.target.value as ParentLink)
                        }
                      >
                        {PARENT_LINKS.map((t) => (
                          <option key={t} value={t}>
                            {LINK_LABELS[t]} parent
                          </option>
                        ))}
                      </select>
                    )}
                    {!readOnly &&
                      addBtn(
                        'Partner',
                        () =>
                          relate(
                            {
                              kind: 'partner',
                              gender:
                                par.gender === 'male'
                                  ? 'female'
                                  : par.gender === 'female'
                                    ? 'male'
                                    : 'other',
                            },
                            par.id,
                          ),
                        `Add a partner for ${nameOf(par)} (a step-parent)`,
                      )}
                  </div>
                </div>
              ))}
              {!readOnly && (
                <>
                  <div className="p-grid">
                    {!hasBirthFather && (
                      <button
                        className="act"
                        onClick={() => relate({ kind: 'parent', gender: 'male', type: 'birth' })}
                      >
                        <span className="ic">
                          <I.Parent />
                        </span>
                        Father
                      </button>
                    )}
                    {!hasBirthMother && (
                      <button
                        className="act"
                        onClick={() => relate({ kind: 'parent', gender: 'female', type: 'birth' })}
                      >
                        <span className="ic">
                          <I.Parent />
                        </span>
                        Mother
                      </button>
                    )}
                  </div>
                  <div className="mini-row labelled">
                    <span>Another parent:</span>
                    <select
                      aria-label="Kind of parent"
                      value={extraParentType}
                      onChange={(e) => setExtraParentType(e.target.value as ParentLink)}
                    >
                      {PARENT_LINKS.filter((t) => t !== 'birth').map((t) => (
                        <option key={t} value={t}>
                          {LINK_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    {addBtn('Father', () =>
                      relate({ kind: 'parent', gender: 'male', type: extraParentType }),
                    )}
                    {addBtn('Mother', () =>
                      relate({ kind: 'parent', gender: 'female', type: extraParentType }),
                    )}
                  </div>
                </>
              )}
            </section>

            {/* ---------------- partners & their children ---------------- */}
            <section className="p-sec">
              <h4>Partners &amp; children</h4>
              {partners.map((sp) => {
                const u = unionOf(tree, p.id, sp.id);
                const kids = kidsWith(sp.id);
                return (
                  <div key={sp.id} className={`union-card st-${u.status}`}>
                    <div className="rel-card">
                      {chip(sp)}
                      <div className="rel-controls">
                        {readOnly ? (
                          <span className="tag">{STATUS_LABELS[u.status]}</span>
                        ) : (
                          <select
                            aria-label={`Relationship with ${nameOf(sp)}`}
                            value={u.status}
                            onChange={(e) =>
                              props.onUnion?.(p.id, sp.id, {
                                status: e.target.value as Union['status'],
                              })
                            }
                          >
                            {UNION_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="union-dates">
                        <input
                          aria-label={`Together since (with ${nameOf(sp)})`}
                          placeholder="Since (year)"
                          value={u.start}
                          onChange={(e) => props.onUnion?.(p.id, sp.id, { start: e.target.value })}
                        />
                        {(u.status === 'divorced' ||
                          u.status === 'separated' ||
                          u.status === 'widowed') && (
                          <input
                            aria-label={`Until (with ${nameOf(sp)})`}
                            placeholder="Until (year)"
                            value={u.end}
                            onChange={(e) => props.onUnion?.(p.id, sp.id, { end: e.target.value })}
                          />
                        )}
                      </div>
                    )}
                    <div className="kids">
                      <h5>
                        Children with {first(sp, 'this partner')}{' '}
                        {kids.length > 0 && <span>· {kids.length}</span>}
                      </h5>
                      {kids.length > 0 && <div className="chips">{kids.map(chip)}</div>}
                      {kidButtons(sp.id)}
                    </div>
                  </div>
                );
              })}
              {otherCoParents.map((op) => {
                const o = person(op);
                return (
                  <div key={op} className="union-card">
                    <div className="kids">
                      <h5>Children with {nameOf(o)}</h5>
                      <div className="chips">{kidsWith(op).map(chip)}</div>
                      {kidButtons(op)}
                    </div>
                  </div>
                );
              })}
              <div className="union-card plain">
                <div className="kids">
                  <h5>
                    {partners.length || otherCoParents.length
                      ? 'Children with no other parent recorded'
                      : 'Children'}
                    {kidsWith(null).length > 0 && <span> · {kidsWith(null).length}</span>}
                  </h5>
                  {kidsWith(null).length > 0 && (
                    <div className="chips">{kidsWith(null).map(chip)}</div>
                  )}
                  {kidButtons(null)}
                </div>
              </div>
              {!readOnly && (
                <div className="mini-row labelled">
                  <span>Add a partner:</span>
                  {addBtn('Husband', () => relate({ kind: 'partner', gender: 'male' }))}
                  {addBtn('Wife', () => relate({ kind: 'partner', gender: 'female' }))}
                  {addBtn('Partner', () => relate({ kind: 'partner', gender: 'other' }))}
                </div>
              )}
            </section>

            {/* ---------------- siblings ---------------- */}
            <section className="p-sec">
              <h4>Brothers &amp; sisters</h4>
              {fullSibs.length > 0 && (
                <div className="rel-group">
                  <h5>Full siblings</h5>
                  <div className="chips">{fullSibs.map(chip)}</div>
                </div>
              )}
              {halfSibs.length > 0 && (
                <div className="rel-group">
                  <h5>Half-siblings</h5>
                  <div className="chips">{halfSibs.map(chip)}</div>
                </div>
              )}
              {!siblings.length && <p className="empty-note">No siblings recorded yet.</p>}
              {!readOnly && (
                <div className="mini-row labelled">
                  {myLineage.length > 1 && (
                    <select
                      aria-label="Shared parents"
                      value={siblingVia}
                      onChange={(e) => setSiblingVia(e.target.value)}
                    >
                      <option value="full">Both parents</option>
                      {myLineage.map((pid) => (
                        <option key={pid} value={pid}>
                          Only {nameOf(person(pid))} (half)
                        </option>
                      ))}
                    </select>
                  )}
                  {addBtn('Brother', () =>
                    relate({
                      kind: 'sibling',
                      gender: 'male',
                      via: myLineage.length > 1 ? siblingVia : 'full',
                    }),
                  )}
                  {addBtn('Sister', () =>
                    relate({
                      kind: 'sibling',
                      gender: 'female',
                      via: myLineage.length > 1 ? siblingVia : 'full',
                    }),
                  )}
                </div>
              )}
            </section>
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
              <p className="empty-note">No logbook entries mention {nameOf(p)} yet.</p>
            )}
            {props.onNewEntry && (
              <button className="act full" onClick={() => props.onNewEntry?.(p.id)}>
                <span className="ic">
                  <I.Pen />
                </span>
                New entry about {nameOf(p)}
              </button>
            )}
          </div>
        )}

        {!readOnly && !isMe && (
          <div className="p-sec p-danger">
            <button className="act danger full" onClick={() => relate({ kind: 'remove' })}>
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
    </>
  );
}
