import type { LogEntry, MediaRef, TreeState } from '../model/types';

/** Storage backend for one user's tree and logbook. */
export interface DataRepo {
  readonly kind: 'local' | 'cloud';
  loadTree(): Promise<TreeState | null>;
  saveTree(tree: TreeState): Promise<void>;
  listEntries(): Promise<LogEntry[]>;
  saveEntry(entry: LogEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  /** Store a media file and return how to find it again. */
  uploadMedia(file: Blob, name: string): Promise<MediaRef>;
  /** Turn a media reference into a URL the browser can display. */
  resolveMedia(ref: MediaRef): Promise<string>;
  deleteMedia(ref: MediaRef): Promise<void>;
  /** Create (or return) the read-only share token for this tree. Cloud only. */
  shareToken?(): Promise<string>;
  revokeShare?(): Promise<void>;
}

/** Inline media limit for browser storage, so one PDF can't fill IndexedDB. */
export const INLINE_MEDIA_LIMIT = 4 * 1024 * 1024;
