import { useCallback, useRef } from 'react';
import type { TreeState } from '../model/types';
import type { Layout, LayoutSizes } from '../model/layout';
import type { Portrait } from '../model/age';
import { usePanZoom } from '../hooks/usePanZoom';
import { FamilyMap } from './FamilyMap';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Refs and controls for a pannable, zoomable map. */
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

  /** Zoom so the whole map fits the screen. */
  const fit = useCallback(
    (w: number, h: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const s = Math.min(1, (vp.clientWidth - 24) / w, (vp.clientHeight - 24) / h);
      setScale(s);
      requestAnimationFrame(() =>
        vp.scrollTo({ left: (vp.scrollWidth - vp.clientWidth) / 2, top: 0 }),
      );
    },
    [setScale],
  );

  return { viewportRef, stageRef, scale, setScale, centerOn, fit };
}

type Canvas = ReturnType<typeof useTreeCanvas>;

interface Props {
  canvas: Canvas;
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

export function TreeCanvas({ canvas, layout, sizes, ...rest }: Props) {
  const { viewportRef, stageRef, scale } = canvas;
  return (
    <div id="viewport" ref={viewportRef}>
      <div id="stageWrap">
        {/* The sizer takes the scaled size so scrolling reaches every edge at any zoom. */}
        <div
          className="sizer"
          style={{ width: layout.width * scale, height: layout.height * scale }}
        >
          <div
            id="stage"
            ref={stageRef}
            style={
              {
                width: layout.width,
                height: layout.height,
                transform: `scale(${scale})`,
                '--disc': `${sizes.disc}px`,
                '--node-w': `${sizes.nodeW}px`,
              } as React.CSSProperties
            }
          >
            <FamilyMap layout={layout} sizes={sizes} {...rest} />
          </div>
        </div>
      </div>
    </div>
  );
}
