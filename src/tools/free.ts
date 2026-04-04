import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MetaAdsClient } from "../client.js";
import {
  AccountIdSchema,
  AccountDateSchema,
  DateRangeSchema,
  defaultDateRange,
} from "../types.js";
import { wrapToolError, toText } from "../utils.js";

const UPGRADE_URL = "https://casperschive.no/mcp/meta-ads-mcp";

function upgradeMessage(toolName: string) {
  return toText({
    error: "PRO_REQUIRED",
    message: `'${toolName}' krever Meta Ads MCP Pro.`,
    upgrade: `Få tilgang til alle 25+ verktøy: ${UPGRADE_URL}`,
    pro_features: [
      "25+ verktøy for Meta Marketing API",
      "Kampanje-nivå KPIer med breakdown",
      "Annonsesett- og annonse-nivå rapportering",
      "Leads og konverteringssporing",
      "Anomali-deteksjon (høy CPC, lav CTR, 0 spend)",
      "Pause/resume kampanjer (human-in-the-loop)",
      "Flerkontos-støtte",
      "5-minutters caching og rate limiting",
    ],
  });
}

const STANDARD_METRICS =
  "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency";
const ECOMMERCE_METRICS =
  "spend,impressions,clicks,ctr,cpc,actions,action_values,purchase_roas";

export function registerFreeTools(
  server: McpServer,
  client: MetaAdsClient
): void {
  // ═══════════════════════════════════════════════════════════
  //  FREE TOOLS — 8 read-only tools
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_get_me",
    "Get information about the authenticated Meta user and their ad accounts",
    {},
    wrapToolError(async () => {
      const data = await client.get("/me", {
        fields: "id,name,email",
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_list_ad_accounts",
    "List all ad accounts the authenticated user has access to",
    {},
    wrapToolError(async () => {
      const data = await client.get("/me/adaccounts", {
        fields:
          "id,name,account_id,account_status,currency,timezone_name,amount_spent",
        limit: 100,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_account_overview",
    "Get a high-level overview of an ad account's performance for a date range",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(accountId, {
        fields: STANDARD_METRICS,
        time_range: JSON.stringify(range),
        level: "account",
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_list_campaigns",
    "List all campaigns in an ad account with status and budget",
    { ...AccountIdSchema.shape },
    wrapToolError(async (args) => {
      const { accountId } = AccountIdSchema.parse(args);
      const data = await client.get(`/${accountId}/campaigns`, {
        fields:
          "id,name,status,effective_status,objective,daily_budget,lifetime_budget,budget_remaining,start_time,stop_time",
        limit: 100,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_campaign_spend",
    "Get spend and basic metrics for all campaigns in an ad account over a date range",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(accountId, {
        fields: STANDARD_METRICS,
        time_range: JSON.stringify(range),
        level: "campaign",
        limit: 100,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_account_ecommerce",
    "Get e-commerce metrics: purchases, revenue, ROAS for an ad account",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(accountId, {
        fields: ECOMMERCE_METRICS,
        time_range: JSON.stringify(range),
        level: "account",
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_daily_breakdown",
    "Get daily spend and metrics breakdown for an ad account",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(accountId, {
        fields: STANDARD_METRICS,
        time_range: JSON.stringify(range),
        time_increment: 1,
        level: "account",
        limit: 90,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_active_vs_paused",
    "Count active vs paused campaigns in an ad account",
    { ...AccountIdSchema.shape },
    wrapToolError(async (args) => {
      const { accountId } = AccountIdSchema.parse(args);
      const data = await client.get<{ data: { status: string }[] }>(
        `/${accountId}/campaigns`,
        {
          fields: "status",
          limit: 500,
        }
      );
      const campaigns = data?.data || [];
      const active = campaigns.filter((c) => c.status === "ACTIVE").length;
      const paused = campaigns.filter((c) => c.status === "PAUSED").length;
      const other = campaigns.length - active - paused;
      return toText({ total: campaigns.length, active, paused, other });
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  PRO STUBS — visible to AI but return upgrade message
  // ═══════════════════════════════════════════════════════════

  const proTools: Array<{ name: string; description: string }> = [
    // Campaign details
    {
      name: "meta_get_campaign_metrics",
      description: "Detailed KPIs for a specific campaign — Pro",
    },
    {
      name: "meta_get_campaign_demographics",
      description: "Age/gender breakdown for a campaign — Pro",
    },
    {
      name: "meta_get_campaign_placements",
      description: "Placement breakdown (Feed, Stories, Reels) — Pro",
    },

    // Ad set level
    {
      name: "meta_list_adsets",
      description: "List ad sets in a campaign — Pro",
    },
    {
      name: "meta_get_adset_metrics",
      description: "Metrics for a specific ad set — Pro",
    },

    // Ad level
    { name: "meta_list_ads", description: "List ads in an ad set — Pro" },
    {
      name: "meta_get_ad_metrics",
      description: "Metrics for a specific ad — Pro",
    },
    {
      name: "meta_get_ad_creatives",
      description: "Get ad creative details (copy, images, links) — Pro",
    },

    // Leads & conversions
    {
      name: "meta_get_leads",
      description: "Get lead form submissions — Pro",
    },
    {
      name: "meta_get_conversions",
      description: "Conversion events breakdown — Pro",
    },
    {
      name: "meta_get_custom_conversions",
      description: "Custom conversion tracking — Pro",
    },

    // Anomaly detection
    {
      name: "meta_detect_anomalies",
      description:
        "Flag campaigns with abnormal CPC, CTR, or zero spend — Pro",
    },
    {
      name: "meta_get_recommendations",
      description:
        "AI-powered recommendations for campaign optimization — Pro",
    },

    // Write operations
    {
      name: "meta_pause_campaign",
      description: "Pause a campaign (human-in-the-loop) — Pro (write)",
    },
    {
      name: "meta_resume_campaign",
      description: "Resume a paused campaign (human-in-the-loop) — Pro (write)",
    },
    {
      name: "meta_update_budget",
      description: "Update campaign daily budget (human-in-the-loop) — Pro (write)",
    },

    // Reporting
    {
      name: "meta_generate_report",
      description: "Generate a formatted performance report — Pro",
    },
    {
      name: "meta_compare_periods",
      description: "Compare metrics across two date ranges — Pro",
    },
  ];

  for (const { name, description } of proTools) {
    const toolName = name;
    server.tool(
      toolName,
      description,
      { accountId: z.string().optional().describe("Ad account ID") },
      wrapToolError(async () => upgradeMessage(toolName))
    );
  }
}
