import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Check if the given email belongs to an admin user. */
export async function checkIsAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string | undefined | null,
): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from("admin_users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  return !!data;
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  if (!(await checkIsAdmin(supabase, user.email)))
    throw new Error("Unauthorized");
  return { supabase, user };
}

export async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have proxy refreshing
          // user sessions.
        }
      },
    },
  });
}

/** Read-only Supabase client for API routes (no cookie writes). */
export async function createApiClient() {
  const cookieStore = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
    cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
  });
}
