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
};
