import type { Person, TreeState } from '../model/types';
import { genFrom, parentsOf } from '../model/tree';
import * as I from './Icons';

export type PanelAction = 'father' | 'mother' | 'partner' | 'sibling' | 'child' | 'remove';

interface Props {
  tree: TreeState;
  person: Person | null;
  onClose: () => void;
  onEdit: (id: string, patch: Partial<Person>) => void;
  onAction: (id: string, action: PanelAction) => void;
  onPickPhoto: (id: string) => void;
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

export function PersonPanel({ tree, person: p, onClose, onEdit, onAction, onPickPhoto }: Props) {
  const show = !!p;
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
    const parents = parentsOf(tree, p);
    const hasM = parents.some((x) => x.gender === 'male');
    const hasF = parents.some((x) => x.gender === 'female');
    const act = (a: PanelAction, icon: React.ReactNode, label: string, cls = '') => (
      <button className={`act ${cls}`.trim()} onClick={() => onAction(p.id, a)}>
        <span className="ic">{icon}</span>
        {label}
      </button>
    );

    body = (
      <>
        <button className="p-close" aria-label="Close" onClick={onClose}>
          <I.X />
        </button>
        <div className="p-head">
          <div
            className="p-photo"
            role="button"
            tabIndex={0}
            aria-label="Change photo"
            onClick={() => onPickPhoto(p.id)}
            onKeyDown={(e) => e.key === 'Enter' && onPickPhoto(p.id)}
          >
            {p.photo ? <img src={p.photo} alt="" /> : <I.User />}
            <span className="edit">
              <I.Camera width={12} height={12} /> edit
            </span>
          </div>
          <div className="p-meta">
            <span className="p-badge">{sideTxt}</span>
            <span className="p-badge">{genTxt}</span>
          </div>
        </div>
        <div className="p-fields">
          <div className="p-field">
            <label htmlFor="fName">Name</label>
            <input
              id="fName"
              value={p.name}
              placeholder="Full name"
              autoComplete="off"
              onChange={(e) => onEdit(p.id, { name: e.target.value })}
            />
          </div>
          <div className="p-field">
            <label htmlFor="fRel">Relationship</label>
            <input
              id="fRel"
              list="relations"
              value={p.relation}
              placeholder="e.g. Mother, Adopted, Guardian"
              autoComplete="off"
              onChange={(e) => onEdit(p.id, { relation: e.target.value })}
            />
          </div>
          <div className="p-field">
            <label htmlFor="fYear">Birth year</label>
            <input
              id="fYear"
              value={p.year}
              placeholder="e.g. 1958"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              onChange={(e) =>
                onEdit(p.id, { year: e.target.value.replace(/\D/g, '').slice(0, 4) })
              }
            />
          </div>
        </div>
        <div className="p-sec">
          <h4>Add relatives</h4>
          <div className="p-grid">
            {!hasM && act('father', <I.Parent />, 'Father')}
            {!hasF && act('mother', <I.Parent />, 'Mother')}
            {act('partner', <I.Heart />, 'Partner', 'partner')}
            {act('sibling', <I.Siblings />, 'Sibling')}
            {act('child', <I.Child />, 'Child', 'full')}
          </div>
        </div>
        <div className="p-sec">
          <div className="p-grid">
            {!isMe && act('remove', <I.Trash />, 'Remove this person', 'danger full')}
          </div>
        </div>
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
