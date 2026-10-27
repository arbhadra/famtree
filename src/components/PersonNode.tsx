import type { Person, TreeState } from '../model/types';
import { childrenOf, countAbove } from '../model/tree';
import * as I from './Icons';

interface Props {
  tree: TreeState;
  person: Person;
  justAdded: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string, which: 'collapsedUp' | 'collapsedDown') => void;
}

export function PersonNode({ tree, person: p, justAdded, onOpen, onToggle }: Props) {
  const isMe = p.id === tree.meId;
  const kids = childrenOf(tree, p.id).length;
  const open = () => onOpen(p.id);

  return (
    <div
      className={`node side-${p.side}${isMe ? ' me' : ''}${justAdded ? ' just-added' : ''}`}
      tabIndex={0}
      role="button"
      aria-label={`${p.name || 'Unnamed'}, ${p.relation || 'relative'} — open`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <div className="disc" data-id={p.id}>
        <div className="pic">
          {p.photo ? (
            <img src={p.photo} alt="" />
          ) : (
            <span className="ph">
              <I.User />
            </span>
          )}
        </div>
        <button
          className="add"
          type="button"
          aria-label="Add relatives"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
        >
          <I.Plus />
        </button>
        {p.parents.length > 0 && (
          <button
            className="pip up"
            type="button"
            aria-label={p.collapsedUp ? 'Show ancestors' : 'Hide ancestors'}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(p.id, 'collapsedUp');
            }}
          >
            {p.collapsedUp ? (
              <>
                <I.Down />
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
            onClick={(e) => {
              e.stopPropagation();
              onToggle(p.id, 'collapsedDown');
            }}
          >
            {p.collapsedDown ? (
              <>
                <I.Up />
                <span>{kids}</span>
              </>
            ) : (
              <I.Down />
            )}
          </button>
        )}
      </div>
      <div className="labels">
        <div className={`nm${p.name ? '' : ' empty'}`}>{p.name || 'Add name'}</div>
        <div className="rl">{p.relation || ' '}</div>
        {p.year && <div className="yr">b. {p.year}</div>}
      </div>
    </div>
  );
}
