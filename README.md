# Family Tree

An interactive family tree builder: add parents, partners, siblings and children, attach photos,
zoom and pan the tree, and export it as an image.

## Stack

Vite · React · TypeScript · Vitest · ESLint · Prettier · GitHub Actions

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests for the tree model
npm run lint
npm run build
```

## Structure

- `src/model` — pure, typed tree logic (`tree.ts`), storage (`persistence.ts`), and tests.
  The tree is a flat id graph; children and siblings are derived by query.
- `src/components` — tree layout, person nodes, SVG connectors, person panel, photo cropper.
- `src/hooks` — zoom and pan.
- `legacy/index.html` — the original single-file version, kept for reference.

Existing trees saved by the original version load unchanged (same `localStorage` key and shape).

## Roadmap

Royal visual redesign · scrolling landing page · accounts and cloud save (Supabase) ·
logbook with a page per entry · richer person details · exports · free hosting on Cloudflare Pages.
