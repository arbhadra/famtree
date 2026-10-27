import { useMemo, useState } from 'react';
import type { TreeState } from '../model/types';
import { displayName, lifespan, searchPeople } from '../model/people';
import { kinshipMap, relationLabel } from '../model/kinship';
import * as I from './Icons';

interface Props {
  tree: TreeState;
  value: string[];
  onChange: (ids: string[]) => void;
}

/** Chips of tagged people plus a type-ahead to tag more from the tree. */
export function PeoplePicker({ tree, value, onChange }: Props) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const computed = useMemo(() => kinshipMap(tree), [tree]);
  const label = (id: string) => (tree.people[id] ? relationLabel(tree.people[id], computed) : '');
  const nameOf = (id: string) => displayName(tree.people[id], label(id) || 'Unnamed');
  const options = searchPeople(tree, q, (p) => label(p.id))
    .filter((p) => !value.includes(p.id))
    .slice(0, 8);

  const add = (id: string) => {
    onChange([...value, id]);
    setQ('');
  };

  return (
    <div className="people-picker">
      <div className="chips">
        {value.map((id) => {
          const p = tree.people[id];
          return (
            <span key={id} className={`chip ${p ? 'side-' + p.side : 'missing'}`}>
              {p ? nameOf(id) : 'Removed person'}
              <button
                type="button"
                aria-label={`Untag ${p ? nameOf(id) : 'person'}`}
                onClick={() => onChange(value.filter((x) => x !== id))}
              >
                <I.X width={10} height={10} />
              </button>
            </span>
          );
        })}
      </div>
      <div className="combo">
        <input
          value={q}
          placeholder={value.length ? 'Tag someone else…' : 'Tag people from your tree…'}
          aria-label="Tag people"
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (options[0]) add(options[0].id);
            }
          }}
        />
        {open && options.length > 0 && (
          <ul className="combo-list" role="listbox">
            {options.map((p) => (
              <li key={p.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(p.id)}
                >
                  <b>{nameOf(p.id)}</b>
                  <small>{[label(p.id), lifespan(p)].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
