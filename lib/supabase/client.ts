import { createBrowserClient } from "@supabase/ssr";
import type { SupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/database.types";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function createBrowserSupabaseClient(config: SupabasePublicConfig | null, remember = true) {
  if (!config) return null;

  return createBrowserClient<Database>(config.url, config.publishableKey, {
    isSingleton: false,
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      maxAge: remember ? REMEMBER_MAX_AGE : undefined,
    },
  });
}
