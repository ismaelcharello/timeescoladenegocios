import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getNetworkingMember } from "@/lib/networking-access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/database.types";

/** D1 owns membership. SQL RPCs are server-only, never a second access policy. */
export async function createAuthorizedDirectoryClient() {
  if (!(await getNetworkingMember())) return null;
  const config = getSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  // Fail closed; never fall back to a user's JWT for privileged directory RPCs.
  if (!config || !key) return null;
  return createClient<Database>(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
