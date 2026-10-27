import { createStore, del, get, set, entries as idbEntries, type UseStore } from 'idb-keyval';
import type { LogEntry, MediaRef, TreeState } from '../model/types';
import { loadTree as loadLegacyTree, STORE_KEY } from '../model/persistence';
import { normalizeTree } from '../model/people';
import { newEntry } from '../model/logbook';
import { readAsDataUrl } from '../lib/media';
import { INLINE_MEDIA_LIMIT, type DataRepo } from './repo';

/** Guest-mode storage: IndexedDB in this browser. Migrates a tree saved by the original app. */
export class LocalRepo implements DataRepo {
  readonly kind = 'local' as const;
  private meta: UseStore;
  private logbook: UseStore;

  constructor(prefix = 'famtree') {
    this.meta = createStore(`${prefix}-meta`, 'kv');
    this.logbook = createStore(`${prefix}-logbook`, 'entries');
  }

  async loadTree(): Promise<TreeState | null> {
    const stored = await get<TreeState>('tree', this.meta);
    if (stored) return normalizeTree(stored);
    const legacy = typeof localStorage !== 'undefined' ? loadLegacyTree() : null;
    if (legacy) {
      const tree = normalizeTree(legacy);
      await this.saveTree(tree);
      return tree;
    }
    return null;
  }

  async saveTree(tree: TreeState) {
    await set('tree', tree, this.meta);
    // Keep the original key current too, so rolling back to the old app never loses work.
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(tree));
    } catch {
      /* quota or private mode: IndexedDB copy is authoritative */
    }
  }

  async listEntries(): Promise<LogEntry[]> {
    const all = await idbEntries<string, LogEntry>(this.logbook);
    return all.map(([, e]) => newEntry(e));
  }

  async saveEntry(entry: LogEntry) {
    await set(entry.id, entry, this.logbook);
  }

  async deleteEntry(id: string) {
    await del(id, this.logbook);
  }

  async uploadMedia(file: Blob): Promise<MediaRef> {
    if (file.size > INLINE_MEDIA_LIMIT)
      throw new Error('Files over 4 MB need an account (cloud storage). Try a smaller file.');
    return { kind: 'inline', dataUrl: await readAsDataUrl(file) };
  }

  async resolveMedia(ref: MediaRef) {
    return ref.kind === 'inline' ? ref.dataUrl : '';
  }

  async deleteMedia() {
    /* inline media is removed with its entry */
  }

  async clear() {
    await del('tree', this.meta);
    const all = await idbEntries<string, LogEntry>(this.logbook);
    await Promise.all(all.map(([k]) => del(k, this.logbook)));
    localStorage.removeItem(STORE_KEY);
  }
}
