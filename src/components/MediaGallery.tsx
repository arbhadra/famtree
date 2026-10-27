import { useState } from 'react';
import type { MediaItem } from '../model/types';
import { useMediaUrl } from '../hooks/useMediaUrl';
import * as I from './Icons';

function Tile({
  item,
  editing,
  onCaption,
  onRemove,
  onOpen,
}: {
  item: MediaItem;
  editing: boolean;
  onCaption: (c: string) => void;
  onRemove: () => void;
  onOpen: (url: string) => void;
}) {
  const url = useMediaUrl(item.ref);
  const isImage = item.mime.startsWith('image/');
  return (
    <figure className="tile">
      <button
        type="button"
        className="tile-view"
        onClick={() => url && onOpen(url)}
        aria-label={`Open ${item.name}`}
      >
        {isImage && url ? (
          <img src={url} alt={item.caption || item.name} loading="lazy" />
        ) : (
          <span className="doc">
            <I.FileIcon width={34} height={34} />
            <small>{item.name}</small>
          </span>
        )}
      </button>
      {editing ? (
        <div className="tile-edit">
          <input
            value={item.caption}
            placeholder="Caption"
            aria-label={`Caption for ${item.name}`}
            onChange={(e) => onCaption(e.target.value)}
          />
          <button
            type="button"
            className="tile-remove"
            aria-label={`Remove ${item.name}`}
            onClick={onRemove}
          >
            <I.Trash width={14} height={14} />
          </button>
        </div>
      ) : (
        item.caption && <figcaption>{item.caption}</figcaption>
      )}
    </figure>
  );
}

interface Props {
  media: MediaItem[];
  editing: boolean;
  onChange?: (m: MediaItem[]) => void;
  onRemove?: (m: MediaItem) => void;
}

export function MediaGallery({ media, editing, onChange, onRemove }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!media.length) return null;
  return (
    <>
      <div className="gallery">
        {media.map((m) => (
          <Tile
            key={m.id}
            item={m}
            editing={editing}
            onCaption={(caption) =>
              onChange?.(media.map((x) => (x.id === m.id ? { ...x, caption } : x)))
            }
            onRemove={() => onRemove?.(m)}
            onOpen={(url) => {
              if (m.mime.startsWith('image/')) setLightbox(url);
              else window.open(url, '_blank', 'noopener');
            }}
          />
        ))}
      </div>
      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-label="Image"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" />
          <button className="p-close" aria-label="Close">
            <I.X />
          </button>
        </div>
      )}
    </>
  );
}
