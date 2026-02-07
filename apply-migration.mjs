import pg from "pg";
import { readFileSync } from "fs";

const { Client } = pg;

// Supabase connection details
const client = new Client({
  host: "db.hqathtprnfdovjyrlyfb.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "gv#DfjEE3dd",
  ssl: {
    rejectUnauthorized: false, // Supabase uses self-signed certs
  },
});

const migrationSql = readFileSync(
  "supabase/migrations/20260207010000_fix_rls_performance.sql",
  "utf-8"
);

console.log("🔌 Connecting to Supabase database...");

try {
  await client.connect();
  console.log("✓ Connected successfully");

  console.log(`\n📝 Applying migration: 20260207010000_fix_rls_performance.sql`);
  console.log(`   Size: ${migrationSql.length} characters`);

  // Execute the entire migration as a single transaction
  await client.query("BEGIN");

  try {
    await client.query(migrationSql);
    await client.query("COMMIT");

    console.log("\n✅ Migration applied successfully!");
    console.log("   - 27 foreign key indexes added");
    console.log("   - 40+ RLS policies optimized");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\n❌ Migration failed:", error.message);
    console.error("   Transaction rolled back");
    process.exit(1);
  }
} catch (error) {
  console.error("\n❌ Connection failed:", error.message);
  process.exit(1);
} finally {
  await client.end();
  console.log("\n🔌 Connection closed");
}
