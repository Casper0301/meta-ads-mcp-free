#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const token = process.env.META_ACCESS_TOKEN;
if (!token) {
  console.error("Error: META_ACCESS_TOKEN environment variable is required");
  console.error(
    "Create a System User token in Meta Business Manager → Business Settings → System Users"
  );
  process.exit(1);
}

console.error(
  "Meta Ads MCP Free — 8 read-only tools.\n" +
    "Upgrade to Pro for 25+ tools including anomaly detection, ad-level metrics, and campaign management:\n" +
    "https://casperschive.no/mcp/meta-ads-mcp"
);

const server = createServer(token);
const transport = new StdioServerTransport();

await server.connect(transport);
