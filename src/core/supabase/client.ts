/// <reference types="vite/client" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const isPlaceholderUrl =
  rawUrl.length === 0 ||
  rawUrl.includes('tu-proyecto.supabase.co') ||
  !rawUrl.startsWith('http');

const isPlaceholderKey =
  rawAnonKey.length === 0 || rawAnonKey === 'sb_publishable_xxx';

export const isSupabaseConfigured: boolean =
  !isPlaceholderUrl && !isPlaceholderKey;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

interface SupabaseErrorLike {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
}

/**
 * Detects whether a Supabase / PostgREST / PostgreSQL error indicates that the
 * expected database tables have not been created yet (migration not applied).
 */
export function isSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    if (typeof error === 'string') {
      const lower = error.toLowerCase();
      return (
        lower.includes('pgrst205') ||
        lower.includes('42p01') ||
        lower.includes('schema cache') ||
        lower.includes('does not exist')
      );
    }
    return false;
  }

  const err = error as SupabaseErrorLike;
  const code = typeof err.code === 'string' ? err.code.toUpperCase() : '';
  if (code === 'PGRST205' || code === '42P01') {
    return true;
  }

  const combined = [err.message, err.details, err.hint]
    .filter((v): v is string => typeof v === 'string')
    .join(' ')
    .toLowerCase();

  return (
    combined.includes('schema cache') ||
    combined.includes('does not exist') ||
    combined.includes('could not find the table')
  );
}
