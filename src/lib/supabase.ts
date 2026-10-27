import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Accounts and cloud save are available only when the deployment provides Supabase keys. */
export const cloudEnabled = !!(url && anonKey);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, anonKey!, { auth: { persistSession: true, detectSessionInUrl: true } })
  : null;

/** Absolute URL of an in-app route, respecting the deploy base path (e.g. /famtree/). */
export const appUrl = (path: string) =>
  window.location.origin + import.meta.env.BASE_URL + path.replace(/^\//, '');
