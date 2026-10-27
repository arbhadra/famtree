import type { CSSProperties } from 'react';
import type { TreeState } from '../model/types';
import type { Layout, LayoutSizes } from '../model/layout';
import type { Portrait } from '../model/age';
import { PersonNode } from './PersonNode';

interface Props {
  tree: TreeState;
  layout: Layout;
  sizes: LayoutSizes;
  labels: Record<string, string>;
  portraits: Record<string, Portrait>;
  visible: Set<string>;
  focusId: string | null;
  readOnly?: boolean;
  onOpen: (id: string, relatives?: boolean) => void;
  onToggle: (id: string, which: 'collapsedUp' | 'collapsedDown') => void;
}

// Browsers that support the CSS `d` property animate edges between layouts; others just redraw.
const dStyle = (d: string) => ({ d: `path("${d}")` }) as CSSProperties;

function heartPath(x: number, y: number, s = 8) {
  return `M ${x} ${y + s * 0.7} C ${x - s} ${y - s * 0.2}, ${x - s * 0.5} ${y - s}, ${x} ${y - s * 0.35} C ${x + s * 0.5} ${y - s}, ${x + s} ${y - s * 0.2}, ${x} ${y + s * 0.7} Z`;
}

export function FamilyMap({
  tree,
  layout,
  sizes,
  labels,
  portraits,
  visible,
  focusId,
  readOnly,
  onOpen,
  onToggle,
}: Props) {
  return (
    <>
      <svg className="edges" width={layout.width} height={layout.height} aria-hidden="true">
        {layout.kin.map((k) => (
          <g key={k.key} className="kin">
            <path className="halo" d={k.d} style={dStyle(k.d)} />
            <path className="line" d={k.d} style={dStyle(k.d)} />
            {k.drops.map((dr) => (
              <g key={dr.childId}>
                <path className="halo" d={dr.d} style={dStyle(dr.d)} />
                <path className={`line lt-${dr.type}`} d={dr.d} style={dStyle(dr.d)} />
              </g>
            ))}
          </g>
        ))}
        {layout.bonds.map((b) => (
          <g key={b.key} className={`bond st-${b.status}`}>
            <path className="halo" d={b.d} style={dStyle(b.d)} />
            <path className="line" d={b.d} style={dStyle(b.d)} />
            <g className="heart" style={{ transform: `translate(${b.heart.x}px, ${b.heart.y}px)` }}>
              <path d={heartPath(0, 0)} />
              {(b.status === 'divorced' || b.status === 'separated') && (
                <path className="crack" d="M 0.5 -6 L -2 -1.5 L 1.5 1 L -0.5 5.5" />
              )}
            </g>
          </g>
        ))}
      </svg>
      {Object.values(layout.nodes).map((n) => {
        const p = tree.people[n.id];
        return (
          <div
            key={n.id}
            className="slot"
            style={{ transform: `translate(${n.x}px, ${n.y}px)`, width: sizes.nodeW }}
          >
            <PersonNode
              tree={tree}
              person={p}
              label={labels[n.id] ?? ''}
              portrait={portraits[n.id]}
              hiddenParents={
                p.collapsedUp || p.parents.some((x) => tree.people[x] && !visible.has(x))
              }
              justAdded={n.id === focusId}
              readOnly={readOnly}
              onOpen={onOpen}
              onToggle={onToggle}
            />
          </div>
        );
      })}
    </>
  );
}
