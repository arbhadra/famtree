import { useCallback, useEffect, useRef, useState } from 'react';

const MIN = 0.15;
const MAX = 1.7;
const clampZoom = (v: number) => Math.min(MAX, Math.max(MIN, Math.round(v * 100) / 100));
const NO_PAN = '.node, button, input, #panel';

/** Zoom (buttons, ctrl+wheel, pinch) and drag-to-pan for a scrollable viewport. */
export function usePanZoom(viewport: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScaleState] = useState(1);
  const scaleRef = useRef(1);

  const setScale = useCallback((v: number) => {
    const next = clampZoom(v);
    scaleRef.current = next;
    setScaleState(next);
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    let pan: { x: number; y: number; l: number; t: number } | null = null;
    let pinch: { d: number; s: number } | null = null;
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(scaleRef.current + (e.deltaY < 0 ? 0.1 : -0.1));
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pan = null;
        pinch = { d: dist(e.touches), s: scaleRef.current };
      } else if (e.touches.length === 1 && !(e.target as Element).closest(NO_PAN)) {
        pan = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          l: el.scrollLeft,
          t: el.scrollTop,
        };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        setScale(pinch.s * (dist(e.touches) / pinch.d));
      } else if (pan && e.touches.length === 1) {
        e.preventDefault();
        el.scrollLeft = pan.l - (e.touches[0].clientX - pan.x);
        el.scrollTop = pan.t - (e.touches[0].clientY - pan.y);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        pan = null;
        pinch = null;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as Element).closest(NO_PAN)) return;
      pan = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop };
      el.classList.add('panning');
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!pan || pinch) return;
      el.scrollLeft = pan.l - (e.clientX - pan.x);
      el.scrollTop = pan.t - (e.clientY - pan.y);
    };
    const onMouseUp = () => {
      pan = null;
      el.classList.remove('panning');
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [viewport, setScale]);

  return { scale, setScale, scaleRef };
}
