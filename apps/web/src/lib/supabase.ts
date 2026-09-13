'use client';

/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description Composant Frontend Web : supabase.ts
 * @created 2026-06-20
 * @updated 2026-06-20
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

const FALLBACK_URL = 'https://nifewhtiqyajztwsegxc.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZmV3aHRpcXlhanp0d3NlZ3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMDc3OTUsImV4cCI6MjEwNDc4Mzc5NX0.o2R9qmW9XH0117TvRTO0Vc4n8A0q7yvKXSmKE2IxpJg';

/** Client Supabase navigateur (session persistée en localStorage). */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;
  _client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return _client;
}
