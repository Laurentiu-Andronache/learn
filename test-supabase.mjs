import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load .env.local
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("Testing Supabase connection...");
console.log(`URL: ${url?.substring(0, 30)}...`);
console.log(`Key: ${key?.substring(0, 20)}...`);

const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

try {
  const { data: themes, error: themesError } = await supabase
    .from("themes")
    .select("*");

  if (themesError) {
    console.error("❌ Themes error:", themesError.message);
  } else {
    console.log("✓ Themes query successful:", themes.length, "themes");
  }

  const { data: adminUsers, error: adminError } = await supabase
    .from("admin_users")
    .select("email, id");

  if (adminError) {
    console.error("❌ Admin users error:", adminError.message);
  } else {
    console.log("✓ Admin users query successful:", adminUsers.length, "users");
    console.log("  Admin emails:", adminUsers.map((u) => u.email));
  }
} catch (err) {
  console.error("❌ Connection failed:", err.message);
}
