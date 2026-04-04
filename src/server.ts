import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaAdsClient } from "./client.js";
import { registerFreeTools } from "./tools/free.js";

export function createServer(token: string): McpServer {
  const server = new McpServer({
    name: "meta-ads-mcp-free",
    version: "1.0.0",
  });

  const client = new MetaAdsClient(token);
  registerFreeTools(server, client);

  return server;
}
