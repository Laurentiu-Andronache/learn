import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTopicTools } from "./tools/topics.js";
import { registerCategoryTools } from "./tools/categories.js";
import { registerQuestionTools } from "./tools/questions.js";
import { registerTranslationTools } from "./tools/translation.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerImportExportTools } from "./tools/import-export.js";
import { registerFeedbackTools } from "./tools/feedback.js";
import { registerUserTools } from "./tools/users.js";
import { registerAdminTools } from "./tools/admin.js";

const server = new McpServer({
  name: "learn-supabase",
  version: "1.0.0",
});

registerTopicTools(server);
registerCategoryTools(server);
registerQuestionTools(server);
registerTranslationTools(server);
registerAnalyticsTools(server);
registerImportExportTools(server);
registerFeedbackTools(server);
registerUserTools(server);
registerAdminTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Learn Supabase MCP server running");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
