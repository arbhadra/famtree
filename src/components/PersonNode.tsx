import type { Person, TreeState } from '../model/types';
import type { Portrait } from '../model/age';
import { childrenOf, countAbove } from '../model/tree';
import { lifespan } from '../model/people';
import { PersonPortrait } from './PersonPortrait';
import * as I from './Icons';

interface Props {
  tree: TreeState;
  person: Person;
  label: string;
  portrait?: Portrait;
  /** Some of this person's parents are hidden (folded or filtered out). */
  hiddenParents: boolean;
  justAdded: boolean;
  readOnly?: boolean;
  onOpen: (id: string, relatives?: boolean) => void;
  onToggle: (id: string, which: 'collapsedUp' | 'collapsedDown') => void;
}

export function PersonNode({
  tree,
  person: p,
  label,
  portrait,
  hiddenParents,
  justAdded,
  onOpen,
  onToggle,
  readOnly,
}: Props) {
  const isMe = p.id === tree.meId;
  const kids = childrenOf(tree, p.id).length;
  const open = () => onOpen(p.id);
  const deceased = !!p.died.trim();

  return (
    <div
      className={`node side-${p.side}${isMe ? ' me' : ''}${justAdded ? ' just-added' : ''}${deceased ? ' deceased' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${p.name || 'Unnamed'}, ${label || 'relative'}${deceased ? ', deceased' : ''} — open`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="disc" data-id={p.id}>
        <PersonPortrait person={p} portrait={portrait} />
        {!readOnly && (
          <button
            className="add"
            type="button"
            aria-label="Add relatives"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(p.id, true);
            }}
          >
            <I.Plus />
          </button>
        )}
        {p.parents.length > 0 && (
          <button
            className="pip up"
            type="button"
            aria-label={p.collapsedUp ? 'Show ancestors' : 'Hide ancestors'}
            title={p.collapsedUp ? 'Show ancestors' : 'Hide ancestors'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(p.id, 'collapsedUp');
            }}
          >
            {p.collapsedUp || hiddenParents ? (
              <>
                <I.Up />
                <span>{countAbove(tree, p)}</span>
              </>
            ) : (
              <I.Up />
            )}
          </button>
        )}
        {kids > 0 && (
          <button
            className="pip down"
            type="button"
            aria-label={p.collapsedDown ? 'Show children' : 'Hide children'}
            title={p.collapsedDown ? 'Show children' : 'Hide children'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(p.id, 'collapsedDown');
            }}
          >
            {p.collapsedDown ? (
              <>
                <I.Down />
                <span>{kids}</span>
              </>
            ) : (
              <I.Down />
            )}
          </button>
        )}
      </div>
      <div className="labels">
        <div className={`nm${p.name ? '' : ' unnamed'}`}>{p.name || 'Add name'}</div>
        <div className="rl">{label || ' '}</div>
        {lifespan(p) && <div className="yr">{lifespan(p)}</div>}
      </div>
    </div>
  );
}
