import { useCallback, useRef } from 'react';
import type { TreeState } from '../model/types';
import { usePanZoom } from '../hooks/usePanZoom';
import { TreeView } from './TreeView';
import { Wires } from './Wires';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Refs and controls for a pannable, zoomable tree. */
export function useTreeCanvas() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { scale, setScale } = usePanZoom(viewportRef);

  const centerOn = useCallback((id: string, smooth = false) => {
    const vp = viewportRef.current;
    const d = stageRef.current?.querySelector<HTMLElement>(`.disc[data-id="${id}"]`);
    if (!vp || !d) return;
    const dr = d.getBoundingClientRect();
    const vr = vp.getBoundingClientRect();
    vp.scrollTo({
      left: vp.scrollLeft + dr.left + dr.width / 2 - (vr.left + vr.width / 2),
      top: vp.scrollTop + dr.top + dr.height / 2 - (vr.top + vr.height / 2),
      behavior: smooth && !reduceMotion() ? 'smooth' : 'auto',
    });
  }, []);

  return { viewportRef, stageRef, scale, setScale, centerOn };
}

type Canvas = ReturnType<typeof useTreeCanvas>;

interface Props {
  canvas: Canvas;
  tree: TreeState;
  focusId: string | null;
  readOnly?: boolean;
  onOpen: (id: string, relatives?: boolean) => void;
  onToggle: (id: string, which: 'collapsedUp' | 'collapsedDown') => void;
}

export function TreeCanvas({ canvas, tree, focusId, readOnly, onOpen, onToggle }: Props) {
  const { viewportRef, stageRef, scale } = canvas;
  return (
    <div id="viewport" ref={viewportRef}>
      <div id="stageWrap">
        <div id="stage" ref={stageRef} style={{ transform: `scale(${scale})` }}>
          <Wires tree={tree} stage={stageRef} scale={scale} layoutKey={focusId} />
          <TreeView
            tree={tree}
            focusId={focusId}
            onOpen={onOpen}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
