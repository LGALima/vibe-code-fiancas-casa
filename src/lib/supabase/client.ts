import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Cliente do Supabase para Client Components (navegador). */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
