import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalRepo } from './localRepo';
import { freshTree, updatePerson } from '../model/tree';
import { newEntry } from '../model/logbook';
import { STORE_KEY } from '../model/persistence';

const mem = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
} as Storage;

let n = 0;
beforeEach(() => {
  mem.clear();
  n++;
});

describe('LocalRepo', () => {
  it('migrates a tree saved by the original app', async () => {
    const t = freshTree();
    mem.set(STORE_KEY, JSON.stringify(updatePerson(t, t.meId, { name: 'Legacy' })));
    const repo = new LocalRepo('t' + n);
    const loaded = await repo.loadTree();
    expect(loaded?.people[t.meId].name).toBe('Legacy');
    expect(loaded?.people[t.meId].died).toBe('');
  });

  it('persists tree and logbook entries', async () => {
    const repo = new LocalRepo('t' + n);
    expect(await repo.loadTree()).toBeNull();
    const t = freshTree();
    await repo.saveTree(t);
    const e = newEntry({ title: 'First' });
    await repo.saveEntry(e);
    const again = new LocalRepo('t' + n);
    expect(await again.loadTree()).toEqual(t);
    expect((await again.listEntries()).map((x) => x.title)).toEqual(['First']);
    await again.deleteEntry(e.id);
    expect(await again.listEntries()).toEqual([]);
  });

  it('rejects oversize inline media', async () => {
    const repo = new LocalRepo('t' + n);
    const big = new Blob([new Uint8Array(5 * 1024 * 1024)]);
    await expect(repo.uploadMedia(big)).rejects.toThrow(/4 MB/);
  });
});
