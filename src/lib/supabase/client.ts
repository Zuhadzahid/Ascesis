"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Browser Supabase client. Reads and writes the session from cookies (shared
 * with the server via @supabase/ssr), so a single sign-in works across
 * Server Components, Route Handlers and the client.
 *
 * A module-level singleton avoids creating a new client (and new realtime
 * socket) on every render.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  browserClient ??= createBrowserClient<Database>(
    env.supabaseUrl,
    env.supabaseKey,
  );
  return browserClient;
}
