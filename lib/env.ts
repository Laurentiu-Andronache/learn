function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/** Lazy env validation — throws on first access, not on import (safe for tests). */
export const env = {
  get SUPABASE_URL() {
    return requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  },
  get SUPABASE_KEY() {
    return requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get SERVICE_ROLE_KEY() {
    const key =
      process.env.LEARN_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key)
      throw new Error(
        "Missing required env var: LEARN_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY",
      );
    return key;
  },
};
