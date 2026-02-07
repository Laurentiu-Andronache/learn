"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function TestDbPage() {
  const [status, setStatus] = useState<{
    connected: boolean;
    themes: any[] | null;
    adminUsers: any[] | null;
    error: string | null;
    envVars: {
      url: boolean;
      anonKey: boolean;
    };
  }>({
    connected: false,
    themes: null,
    adminUsers: null,
    error: null,
    envVars: {
      url: false,
      anonKey: false,
    },
  });

  useEffect(() => {
    async function testConnection() {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

      setStatus((prev) => ({
        ...prev,
        envVars: {
          url: !!url,
          anonKey: !!key,
        },
      }));

      if (!url || !key) {
        setStatus((prev) => ({
          ...prev,
          error: "Missing environment variables",
        }));
        return;
      }

      const supabase = createBrowserClient(url, key);

      try {
        // Test themes table
        const { data: themes, error: themesError } = await supabase
          .from("themes")
          .select("*");

        if (themesError) throw themesError;

        // Test admin_users table
        const { data: adminUsers, error: adminError } = await supabase
          .from("admin_users")
          .select("email, id");

        if (adminError) throw adminError;

        setStatus({
          connected: true,
          themes,
          adminUsers,
          error: null,
          envVars: {
            url: true,
            anonKey: true,
          },
        });
      } catch (err: any) {
        setStatus((prev) => ({
          ...prev,
          connected: false,
          error: err.message || "Unknown error",
        }));
      }
    }

    testConnection();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Database Connection Test</h1>

        {/* Connection Status */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
          {status.error ? (
            <div className="text-red-600 dark:text-red-400">
              ✗ {status.error}
            </div>
          ) : status.connected ? (
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
          {status.themes !== null ? (
            <div className="text-gray-600 dark:text-gray-400">
              Found {status.themes.length} themes
              {status.themes.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(status.themes, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          )}
        </div>

        {/* Admin Users Table */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Admin Users Table</h2>
          {status.adminUsers !== null ? (
            <div className="text-gray-600 dark:text-gray-400">
              Found {status.adminUsers.length} admin users
              {status.adminUsers.length > 0 && (
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(status.adminUsers, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <div className="text-gray-600 dark:text-gray-400">Loading...</div>
          )}
        </div>

        {/* Environment Variables */}
        <div className="rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-2">Environment</h2>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div>URL: {status.envVars.url ? "✓ Set" : "✗ Missing"}</div>
            <div>Anon Key: {status.envVars.anonKey ? "✓ Set" : "✗ Missing"}</div>
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
