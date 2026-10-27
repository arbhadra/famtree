import type { SupabaseClient } from '@supabase/supabase-js';
import type { LogEntry, MediaRef, TreeState } from '../model/types';
import { normalizeTree } from '../model/people';
import { newEntry } from '../model/logbook';
import type { DataRepo } from './repo';

const BUCKET = 'media';
const SIGNED_URL_TTL = 60 * 60; // seconds

/** Row shape of public.logbook_entries (see supabase/migrations). */
interface EntryRow {
  id: string;
  owner: string;
  title: string;
  entry_type: LogEntry['type'];
  date_value: string;
  date_end: string;
  date_qualifier: LogEntry['dateQualifier'];
  place: string;
  people: string[];
  body: string;
  media: LogEntry['media'];
  sources: string;
  needs_verification: boolean;
  status: LogEntry['status'];
  created_at: string;
  updated_at: string;
}

const toRow = (e: LogEntry, owner: string): EntryRow => ({
  id: e.id,
  owner,
  title: e.title,
  entry_type: e.type,
  date_value: e.date,
  date_end: e.dateEnd,
  date_qualifier: e.dateQualifier,
  place: e.place,
  people: e.people,
  body: e.body,
  media: e.media,
  sources: e.sources,
  needs_verification: e.needsVerification,
  status: e.status,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});

const fromRow = (r: EntryRow): LogEntry =>
  newEntry({
    id: r.id,
    title: r.title,
    type: r.entry_type,
    date: r.date_value,
    dateEnd: r.date_end,
    dateQualifier: r.date_qualifier,
    place: r.place,
    people: r.people ?? [],
    body: r.body,
    media: r.media ?? [],
    sources: r.sources,
    needsVerification: r.needs_verification,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Signed-in storage: Postgres tables and a private Storage bucket, scoped by row-level security. */
export class CloudRepo implements DataRepo {
  readonly kind = 'cloud' as const;
  private urlCache = new Map<string, { url: string; exp: number }>();

  constructor(
    private db: SupabaseClient,
    private userId: string,
  ) {}

  async loadTree(): Promise<TreeState | null> {
    const row = check(
      await this.db.from('trees').select('data').eq('owner', this.userId).maybeSingle(),
    ) as { data: TreeState } | null;
    return row?.data ? normalizeTree(row.data) : null;
  }

  async saveTree(tree: TreeState) {
    check(
      await this.db
        .from('trees')
        .upsert(
          { owner: this.userId, data: tree, updated_at: new Date().toISOString() },
          { onConflict: 'owner' },
        ),
    );
  }

  async listEntries(): Promise<LogEntry[]> {
    const rows = check(
      await this.db.from('logbook_entries').select('*').eq('owner', this.userId),
    ) as EntryRow[];
    return rows.map(fromRow);
  }

  async saveEntry(entry: LogEntry) {
    check(await this.db.from('logbook_entries').upsert(toRow(entry, this.userId)));
  }

  async deleteEntry(id: string) {
    check(await this.db.from('logbook_entries').delete().eq('id', id));
  }

  async uploadMedia(file: Blob, name: string): Promise<MediaRef> {
    const ext = (name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    // First folder must be the user id: the storage policy checks it.
    const path = `${this.userId}/${crypto.randomUUID()}.${ext}`;
    check(
      await this.db.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false }),
    );
    return { kind: 'storage', path };
  }

  async resolveMedia(ref: MediaRef) {
    if (ref.kind === 'inline') return ref.dataUrl;
    const hit = this.urlCache.get(ref.path);
    if (hit && hit.exp > Date.now()) return hit.url;
    const data = check(
      await this.db.storage.from(BUCKET).createSignedUrl(ref.path, SIGNED_URL_TTL),
    );
    if (!data) throw new Error('Could not open that file');
    this.urlCache.set(ref.path, {
      url: data.signedUrl,
      exp: Date.now() + (SIGNED_URL_TTL - 60) * 1000,
    });
    return data.signedUrl;
  }

  async deleteMedia(ref: MediaRef) {
    if (ref.kind === 'storage') check(await this.db.storage.from(BUCKET).remove([ref.path]));
  }

  async shareToken() {
    const token = check(await this.db.rpc('ensure_share_token')) as string;
    return token;
  }

  async revokeShare() {
    check(await this.db.from('trees').update({ share_token: null }).eq('owner', this.userId));
  }
}

/** Read-only fetch of a shared tree by token (no sign-in needed). */
export async function fetchSharedTree(
  db: SupabaseClient,
  token: string,
): Promise<TreeState | null> {
  const data = check(await db.rpc('get_shared_tree', { token })) as TreeState | null;
  return data ? normalizeTree(data) : null;
}
