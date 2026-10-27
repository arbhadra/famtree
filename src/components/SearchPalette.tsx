import { useState } from 'react';
import type { TreeState } from '../model/types';
import { displayName, lifespan, searchPeople } from '../model/people';
import * as I from './Icons';

interface Props {
  tree: TreeState;
  open: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}

/** Ctrl/⌘+K people finder: type to filter, arrows to move, Enter to jump. */
export function SearchPalette(props: Props) {
  return props.open ? <Palette {...props} /> : null;
}

function Palette({ tree, onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const results = searchPeople(tree, q).slice(0, 12);
  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  return (
    <div className="modal-scrim top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Find a person">
        <div className="palette-input">
          <I.Search width={18} height={18} />
          <input
            autoFocus
            value={q}
            placeholder="Find a person by name, relation or place…"
            aria-label="Search people"
            onChange={(e) => {
              setQ(e.target.value);
              setI(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setI((x) => Math.min(results.length - 1, x + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setI((x) => Math.max(0, x - 1));
              } else if (e.key === 'Enter' && results[i]) pick(results[i].id);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <ul className="palette-list" role="listbox">
          {results.map((p, idx) => (
            <li key={p.id} role="option" aria-selected={idx === i}>
              <button onMouseEnter={() => setI(idx)} onClick={() => pick(p.id)}>
                <span className={`dot side-${p.side}`}>
                  {p.photo ? <img src={p.photo} alt="" /> : null}
                </span>
                <span className="who">
                  <b>{displayName(p)}</b>
                  <small>
                    {[p.relation, lifespan(p), p.birthplace].filter(Boolean).join(' · ')}
                  </small>
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="none">No one matches “{q}”.</li>}
        </ul>
      </div>
    </div>
  );
}
