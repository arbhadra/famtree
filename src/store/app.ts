import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Change, LogEntry, Person, TreeState } from '../model/types';
import { freshTree, updatePerson } from '../model/tree';
import { initHistory, push, redo, undo, type History } from '../model/history';
import type { DataRepo } from '../data/repo';
import { LocalRepo } from '../data/localRepo';
import { CloudRepo } from '../data/cloudRepo';
import { supabase } from '../lib/supabase';
import { toast } from './toast';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
}

interface AppState {
  /** True once the session check and first data load have finished. */
  ready: boolean;
  user: AccountUser | null;
  repo: DataRepo;
  history: History;
  entries: Record<string, LogEntry>;
  saveState: SaveState;
  saveError: string;

  /** Apply a structural change (add/remove relatives) as one undo step. */
  apply: (c: Change) => void;
  /** Replace the tree; pass `key` so rapid edits of the same field merge into one undo step. */
  change: (next: TreeState, key?: string) => void;
  /** Edit a person's fields; rapid edits to the same field merge into one undo step. */
  edit: (id: string, patch: Partial<Person>) => void;
  undo: () => void;
  redo: () => void;
  /** Replace everything (start over, import). */
  replaceAll: (tree: TreeState, entries: LogEntry[]) => Promise<void>;
  upsertEntry: (e: LogEntry) => void;
  deleteEntry: (id: string) => Promise<void>;
}

const local = new LocalRepo();
const TREE_DEBOUNCE = 700;
const ENTRY_DEBOUNCE = 700;

const toUser = (u: User): AccountUser => ({
  id: u.id,
  email: u.email ?? '',
  name:
    (u.user_metadata?.display_name as string) ||
    (u.user_metadata?.full_name as string) ||
    u.email?.split('@')[0] ||
    '',
});

export const useApp = create<AppState>((set, get) => ({
  ready: false,
  user: null,
  repo: local,
  history: initHistory(freshTree()),
  entries: {},
  saveState: 'idle',
  saveError: '',

  apply: (c) => {
    set((s) => ({ history: push(s.history, c.state) }));
    scheduleTreeSave();
  },

  change: (next, key) => {
    set((s) => ({ history: push(s.history, next, key ?? null) }));
    scheduleTreeSave();
  },

  edit: (id, patch) => {
    const h = get().history;
    const next = updatePerson(h.present, id, patch);
    set({ history: push(h, next, `${id}:${Object.keys(patch).join(',')}`) });
    scheduleTreeSave();
  },

  undo: () => {
    set((s) => ({ history: undo(s.history) }));
    scheduleTreeSave();
  },

  redo: () => {
    set((s) => ({ history: redo(s.history) }));
    scheduleTreeSave();
  },

  replaceAll: async (tree, entries) => {
    const { repo, entries: old } = get();
    set({ history: initHistory(tree), entries: Object.fromEntries(entries.map((e) => [e.id, e])) });
    await track(async () => {
      await repo.saveTree(tree);
      await Promise.all(
        Object.keys(old)
          .filter((id) => !entries.some((e) => e.id === id))
          .map((id) => repo.deleteEntry(id)),
      );
      await Promise.all(entries.map((e) => repo.saveEntry(e)));
    });
  },

  upsertEntry: (e) => {
    const entry = { ...e, updatedAt: new Date().toISOString() };
    set((s) => ({ entries: { ...s.entries, [e.id]: entry } }));
    scheduleEntrySave(e.id);
  },

  deleteEntry: async (id) => {
    const { repo, entries } = get();
    const e = entries[id];
    const rest = { ...entries };
    delete rest[id];
    set({ entries: rest });
    clearTimeout(entryTimers.get(id));
    await track(async () => {
      await repo.deleteEntry(id);
      if (e) await Promise.all(e.media.map((m) => repo.deleteMedia(m.ref).catch(() => {})));
    });
  },
}));

/* ------------------------------ autosave ------------------------------ */

let treeTimer: ReturnType<typeof setTimeout> | undefined;
const entryTimers = new Map<string, ReturnType<typeof setTimeout>>();
let inFlight = 0;

async function track(job: () => Promise<void>) {
  inFlight++;
  useApp.setState({ saveState: 'saving' });
  try {
    await job();
    inFlight--;
    if (!inFlight) useApp.setState({ saveState: 'saved', saveError: '' });
  } catch (err) {
    inFlight--;
    console.error(err);
    useApp.setState({ saveState: 'error', saveError: (err as Error).message });
  }
}

function scheduleTreeSave() {
  useApp.setState({ saveState: 'saving' });
  clearTimeout(treeTimer);
  treeTimer = setTimeout(() => {
    const { repo, history } = useApp.getState();
    void track(() => repo.saveTree(history.present));
  }, TREE_DEBOUNCE);
}

function scheduleEntrySave(id: string) {
  useApp.setState({ saveState: 'saving' });
  clearTimeout(entryTimers.get(id));
  entryTimers.set(
    id,
    setTimeout(() => {
      entryTimers.delete(id);
      const { repo, entries } = useApp.getState();
      if (entries[id]) void track(() => repo.saveEntry(entries[id]));
    }, ENTRY_DEBOUNCE),
  );
}

/** Write any pending debounced saves now (before switching accounts or leaving). */
export async function flushSaves() {
  const { repo, history, entries } = useApp.getState();
  const jobs: Promise<void>[] = [];
  if (treeTimer) {
    clearTimeout(treeTimer);
    treeTimer = undefined;
    jobs.push(repo.saveTree(history.present));
  }
  for (const [id, t] of entryTimers) {
    clearTimeout(t);
    if (entries[id]) jobs.push(repo.saveEntry(entries[id]));
  }
  entryTimers.clear();
  await Promise.all(jobs);
}

/* --------------------------- session / loading ------------------------- */

const isEmptyTree = (t: TreeState | null) =>
  !t || (Object.keys(t.people).length <= 1 && !t.people[t.meId]?.name && !t.people[t.meId]?.photo);

async function loadFrom(repo: DataRepo, user: AccountUser | null) {
  let [tree, entries] = await Promise.all([repo.loadTree(), repo.listEntries()]);

  // First sign-in on this device: carry the guest tree and logbook into the account.
  if (repo.kind === 'cloud' && isEmptyTree(tree) && !entries.length) {
    const [lt, le] = await Promise.all([local.loadTree(), local.listEntries()]);
    if (!isEmptyTree(lt)) {
      tree = lt;
      entries = le;
      await repo.saveTree(lt!);
      await Promise.all(le.map((e) => repo.saveEntry(e)));
      toast('Your tree from this device is now saved to your account');
    }
  }

  useApp.setState({
    ready: true,
    user,
    repo,
    history: initHistory(tree ?? freshTree()),
    entries: Object.fromEntries(entries.map((e) => [e.id, e])),
    saveState: 'idle',
    saveError: '',
  });
}

let currentUserId: string | null | undefined;

async function switchTo(u: User | null) {
  const id = u?.id ?? null;
  if (id === currentUserId) return;
  currentUserId = id;
  await flushSaves().catch(() => {});
  try {
    if (u && supabase) await loadFrom(new CloudRepo(supabase, u.id), toUser(u));
    else await loadFrom(local, null);
  } catch (err) {
    console.error(err);
    toast('Could not load your account data — showing this device’s tree');
    await loadFrom(local, null);
  }
}

/** Start the session: restore a signed-in user if any, else guest mode. */
export async function boot() {
  if (!supabase) return switchTo(null);
  const { data } = await supabase.auth.getSession();
  await switchTo(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_event, session) => {
    void switchTo(session?.user ?? null);
  });
}

if (typeof window !== 'undefined')
  window.addEventListener('beforeunload', (e) => {
    if (treeTimer || entryTimers.size) {
      void flushSaves();
      e.preventDefault();
    }
  });

/* ------------------------------ selectors ------------------------------ */

export const useTree = () => useApp((s) => s.history.present);
