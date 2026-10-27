import type { Person, TreeState } from '../model/types';
import { childrenOf, getRootId, parentsOf, spousesOf } from '../model/tree';
import { PersonNode } from './PersonNode';

interface Props {
  tree: TreeState;
  focusId: string | null;
  onOpen: (id: string) => void;
  onToggle: (id: string, which: 'collapsedUp' | 'collapsedDown') => void;
}

/**
 * Top-down genealogy layout: ancestors above, descendants below. The render root is the topmost
 * ancestor reached from "me". A married-in spouse shows their own ancestry above them.
 */
export function TreeView({ tree, focusId, onOpen, onToggle }: Props) {
  const node = (p: Person) => (
    <PersonNode
      key={p.id}
      tree={tree}
      person={p}
      justAdded={p.id === focusId}
      onOpen={onOpen}
      onToggle={onToggle}
    />
  );

  const memberCol = (p: Person, withAncestors: boolean, seen: Set<string>) => (
    <div className="member" key={p.id}>
      {withAncestors && p.parents.length > 0 && !p.collapsedUp && (
        <div className="ancestors">
          <div className="couple-row">
            {parentsOf(tree, p)
              .filter((par) => !seen.has(par.id))
              .map((par) => memberCol(par, true, seen))}
          </div>
        </div>
      )}
      {node(p)}
    </div>
  );

  const renderDown = (id: string, seen: Set<string>): React.ReactNode => {
    if (seen.has(id)) return <div key={id} />;
    seen.add(id);
    const p = tree.people[id];
    const primary = memberCol(p, false, seen); // no ancestry here: it is already above in the tree
    const cols = spousesOf(tree, p)
      .filter((s) => !seen.has(s.id))
      .map((s) => memberCol(s, true, seen));
    const kids = childrenOf(tree, id).filter((k) => !seen.has(k.id));
    return (
      <div className="unit" key={id}>
        <div className="couple-row">
          {primary}
          {cols}
        </div>
        {kids.length > 0 && !p.collapsedDown && (
          <div className="children-row">{kids.map((k) => renderDown(k.id, seen))}</div>
        )}
      </div>
    );
  };

  return <div id="tree">{renderDown(getRootId(tree), new Set())}</div>;
}
