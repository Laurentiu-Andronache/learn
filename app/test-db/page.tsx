import { createClient } from "@supabase/supabase-js";

// Force dynamic rendering for this test page
export const dynamic = "force-dynamic";

async function getServerData() {
  // Use service role key to bypass RLS for all test queries
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  // Test themes table
  const { data: themes, error: themesError } = await supabase
    .from("themes")
    .select("*");

  // Test admin_users table
  const { data: adminUsers, error: adminError } = await supabase
    .from("admin_users")
    .select("email, id");

  return {
    themes,
    themesError,
    adminUsers,
    adminError,
    envVars: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  };
}

export default async function TestDbPage() {
  const { themes, themesError, adminUsers, adminError, envVars } =
    await getServerData();

  const connected = !themesError && !adminError;
  const error = themesError?.message || adminError?.message;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Database Connection Test</h1>

        {/* Connection Status */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
          {error ? (
            <div className="text-red-600 dark:text-red-400">✗ {error}</div>
          ) : connected ? (
            <div className="text-green-600 dark:text-green-400">
              ✓ Connected to Supabase successfully!
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">
              Testing connection...
            </div>
          )}
        </div>

        {/* Themes Table */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Themes Table</h2>
          {themesError ? (
            <div className="text-red-600 dark:text-red-400">
              Error: {themesError.message}
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">
              Found {themes?.length || 0} themes
              {themes && themes.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(themes, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Admin Users Table */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">
            Admin Users Table{" "}
            <span className="text-sm font-normal text-gray-500">
              (via service role)
            </span>
          </h2>
          {adminError ? (
            <div className="text-red-600 dark:text-red-400">
              Error: {adminError.message}
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">
              Found {adminUsers?.length || 0} admin users
              {adminUsers && adminUsers.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(adminUsers, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Environment</h2>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div>URL: {envVars.url ? "✓ Set" : "✗ Missing"}</div>
            <div>Anon Key: {envVars.anonKey ? "✓ Set" : "✗ Missing"}</div>
            <div>Service Key: {envVars.serviceKey ? "✓ Set" : "✗ Missing"}</div>
          </div>
        </div>

        {/* Expected Tables */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Expected Tables (15)</h2>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div>1. themes</div>
            <div>2. categories</div>
            <div>3. questions</div>
            <div>4. profiles</div>
            <div>5. admin_users</div>
            <div>6. user_card_state</div>
            <div>7. review_logs</div>
            <div>8. suspended_questions</div>
            <div>9. hidden_themes</div>
            <div>10. reading_progress</div>
            <div>11. feedback</div>
            <div>12. question_reports</div>
            <div>13. proposed_questions</div>
            <div>14. theme_proposals</div>
            <div>15. (RLS + indexes)</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-lg border border-blue-500 bg-blue-50 dark:bg-blue-950 p-4">
          <h2 className="text-xl font-semibold mb-2">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              If you see errors above, verify the migration was applied in
              Supabase dashboard
            </li>
            <li>Check that all environment variables are set correctly</li>
            <li>
              Once successful, you can start building features (auth, quiz
              mode, etc.)
            </li>
          </ol>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
