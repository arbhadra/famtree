import type { EntryType } from '../model/types';

const GLYPH: Record<EntryType, string> = {
  memory: '✦',
  event: '⚜',
  birth: '✿',
  marriage: '♥',
  death: '✝',
  migration: '⚓',
  story: '✒',
  recipe: '❦',
  document: '✉',
  other: '❖',
};

/** Wax-seal style emblem for an entry type, used when an entry has no cover image. */
export function EntryEmblem({ type, size = 56 }: { type: EntryType; size?: number }) {
  return (
    <span
      className={`emblem t-${type}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {GLYPH[type]}
    </span>
  );
}
