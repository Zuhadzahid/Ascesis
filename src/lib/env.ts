/**
 * Central, validated access to public environment variables.
 * These are exposed to the browser (NEXT_PUBLIC_*) and are safe to ship.
 * The service-role key is NEVER imported here; it lives only in test/server code.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    // Fail loudly at startup rather than producing a broken Supabase client.
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  /**
   * Supabase publishable key (sb_publishable_...). The legacy "anon" key also
   * works; we accept whichever is provided so existing projects keep running.
   */
  supabaseKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
};
