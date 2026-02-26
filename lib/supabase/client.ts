import { createBrowserClient } from "@supabase/ssr";

// Static process.env.NEXT_PUBLIC_* access required — Next.js inlines these at build time.
// Dynamic access (e.g., process.env[name]) returns undefined on the client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
