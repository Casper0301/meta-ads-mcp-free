import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaAdsClient } from "./client.js";
import { registerFreeTools } from "./tools/free.js";
import { registerProTools } from "./tools/pro.js";

export function createServer(token: string): McpServer {
  const server = new McpServer({
    name: "meta-ads-mcp-free",
    version: "1.0.0",
  });

  const client = new MetaAdsClient(token);
  registerFreeTools(server, client);

  if (process.env.META_PRO === "true") {
    registerProTools(server, client);
  }

  return server;
}
