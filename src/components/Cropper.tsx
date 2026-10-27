import { useEffect, useRef, useState } from 'react';

const FRAME = 264; // on-screen crop square
const OUT = 320; // exported circle diameter

interface Props {
  src: string;
  onCancel: () => void;
  onApply: (dataUrl: string) => void;
}

/** Circular photo cropper: drag to move, slider to zoom around the centre. */
export function Cropper({ src, onCancel, onApply }: Props) {
  const [n, setN] = useState<{ img: HTMLImageElement; w: number; h: number; base: number } | null>(
    null,
  );
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (x: number, y: number, z: number) => {
    if (!n) return { x, y };
    const w = n.w * n.base * z;
    const h = n.h * n.base * z;
    return { x: Math.min(0, Math.max(FRAME - w, x)), y: Math.min(0, Math.max(FRAME - h, y)) };
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const base = Math.max(FRAME / img.naturalWidth, FRAME / img.naturalHeight);
      setN({ img, w: img.naturalWidth, h: img.naturalHeight, base });
      setPos({
        x: (FRAME - img.naturalWidth * base) / 2,
        y: (FRAME - img.naturalHeight * base) / 2,
      });
    };
    img.src = src;
  }, [src]);

  const dispW = n ? n.w * n.base * zoom : 0;
  const dispH = n ? n.h * n.base * zoom : 0;

  const onZoom = (z: number) => {
    const c = FRAME / 2;
    setPos((p) => clamp(c - ((c - p.x) / zoom) * z, c - ((c - p.y) / zoom) * z, z));
    setZoom(z);
  };

  const apply = () => {
    if (!n) return;
    const k = OUT / FRAME;
    const cv = document.createElement('canvas');
    cv.width = OUT;
    cv.height = OUT;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#e4d3a6';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(n.img, pos.x * k, pos.y * k, dispW * k, dispH * k);
    onApply(cv.toDataURL('image/jpeg', 0.86));
  };

  return (
    <div id="cropper" className="show">
      <div className="crop-box">
        <h3>Frame the photo</h3>
        <p>Drag to move · use the slider to zoom</p>
        <div
          className={`crop-stage${dragging ? ' dragging' : ''}`}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !n) return;
            setPos(clamp(d.ox + e.clientX - d.x, d.oy + e.clientY - d.y, zoom));
          }}
          onPointerUp={() => {
            drag.current = null;
            setDragging(false);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
          }}
        >
          {n && (
            <img
              src={src}
              alt=""
              style={{ width: dispW, height: dispH, transform: `translate(${pos.x}px,${pos.y}px)` }}
            />
          )}
          <div className="ring" />
        </div>
        <div className="crop-zoom">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            aria-label="Zoom"
            onChange={(e) => onZoom(parseFloat(e.target.value))}
          />
        </div>
        <div className="crop-actions">
          <button className="btn subtle" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn primary" onClick={apply} disabled={!n}>
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
}
