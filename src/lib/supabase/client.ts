import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseEnv } from "./env";

/** Cliente do Supabase para Client Components (navegador). */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
