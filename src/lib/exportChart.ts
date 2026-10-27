import { download } from './media';

const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cormorant+Garamond:ital,wght@1,400;1,500&display=swap';

let fontCss: Promise<string> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]);
}

async function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/**
 * @font-face rules with the font files inlined, so a rasterised SVG (which can't load external
 * resources) still uses the site's typefaces. Falls back to system serifs if offline.
 */
export function embeddedFonts(): Promise<string> {
  fontCss ??= (async () => {
    try {
      const css = await withTimeout(
        fetch(FONT_CSS).then((r) => r.text()),
        4000,
      );
      // Latin subset only: enough for names, and keeps exports small.
      const blocks = css.match(/\/\* latin \*\/\s*@font-face\s*\{[^}]*\}/g) ?? [];
      const out = await Promise.all(
        blocks.map(async (b) => {
          const url = b.match(/url\(([^)]+)\)/)?.[1];
          if (!url) return '';
          const data = await withTimeout(
            fetch(url)
              .then((r) => r.blob())
              .then(toDataUrl),
            6000,
          );
          return b.replace(url, data).replace(/\/\* latin \*\/\s*/, '');
        }),
      );
      return out.join('\n');
    } catch {
      return '';
    }
  })();
  return fontCss;
}

/** Draw an SVG element to a canvas at `scale` × its intrinsic size. */
export async function svgToCanvas(svg: SVGSVGElement, scale = 2): Promise<HTMLCanvasElement> {
  const w = Number(svg.getAttribute('width'));
  const h = Number(svg.getAttribute('height'));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const fonts = await embeddedFonts();
  if (fonts) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = fonts;
    clone.insertBefore(style, clone.firstChild);
  }
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not render the chart'));
      img.src = url;
    });
    // Browsers cap canvas area; shrink the scale for very large charts.
    const maxPixels = 120_000_000;
    const s = Math.min(scale, Math.sqrt(maxPixels / (w * h)));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * s);
    canvas.height = Math.round(h * s);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(svg: SVGSVGElement, filename: string) {
  const canvas = await svgToCanvas(svg, 3);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!blob) throw new Error('Could not create the image');
  download(filename, blob);
}

export type PaperSize = 'a4' | 'a3' | 'letter';

/** A print-ready PDF: the chart fitted to the page (orientation chosen by its shape), with margins. */
export async function downloadPdf(svg: SVGSVGElement, filename: string, paper: PaperSize = 'a4') {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), svgToCanvas(svg, 3)]);
  const w = canvas.width;
  const h = canvas.height;
  const orientation = w >= h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: paper, compress: true });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const k = Math.min((pw - margin * 2) / w, (ph - margin * 2) / h);
  const iw = w * k;
  const ih = h * k;
  pdf.setProperties({ title: filename.replace(/\.pdf$/, ''), creator: 'Family Tree' });
  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.92),
    'JPEG',
    (pw - iw) / 2,
    (ph - ih) / 2,
    iw,
    ih,
    undefined,
    'FAST',
  );
  pdf.save(filename);
}

export async function downloadSvg(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const fonts = await embeddedFonts();
  if (fonts) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = fonts;
    clone.insertBefore(style, clone.firstChild);
  }
  download(filename, new XMLSerializer().serializeToString(clone), 'image/svg+xml');
}
