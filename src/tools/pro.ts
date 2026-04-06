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
import {
  ACCOUNTS,
  getAccountName,
  getAccountType,
  parseBudget,
  parseLeads,
  parseRevenue,
} from "../accounts.js";

const FULL_METRICS =
  "campaign_name,campaign_id,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values";

const CampaignDateSchema = z.object({
  campaignId: z.string().describe("Campaign ID"),
  since: z.string().optional().describe("Start date (YYYY-MM-DD)"),
  until: z.string().optional().describe("End date (YYYY-MM-DD)"),
});

const AdSetIdSchema = z.object({
  adsetId: z.string().describe("Ad set ID"),
});

const AdIdSchema = z.object({
  adId: z.string().describe("Ad ID"),
});

export function registerProTools(
  server: McpServer,
  client: MetaAdsClient
): void {
  // ═══════════════════════════════════════════════════════════
  //  ACCOUNT REGISTRY
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_list_managed_accounts",
    "List all managed ad accounts with names and types (lead_gen vs ecommerce)",
    {},
    wrapToolError(async () => {
      return toText(
        Object.values(ACCOUNTS).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
        }))
      );
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  CAMPAIGN DETAILS
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_get_campaign_metrics",
    "Detailed KPIs for a specific campaign including leads, revenue, and all actions",
    { ...CampaignDateSchema.shape },
    wrapToolError(async (args) => {
      const { campaignId, since, until } = CampaignDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(campaignId, {
        fields: FULL_METRICS,
        time_range: JSON.stringify(range),
        level: "campaign",
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_campaign_demographics",
    "Age and gender breakdown for a campaign",
    { ...CampaignDateSchema.shape },
    wrapToolError(async (args) => {
      const { campaignId, since, until } = CampaignDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(campaignId, {
        fields: "spend,impressions,clicks,ctr,cpc,actions",
        time_range: JSON.stringify(range),
        breakdowns: "age,gender",
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_campaign_placements",
    "Placement breakdown (Feed, Stories, Reels, etc.) for a campaign",
    { ...CampaignDateSchema.shape },
    wrapToolError(async (args) => {
      const { campaignId, since, until } = CampaignDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights(campaignId, {
        fields: "spend,impressions,clicks,ctr,cpc,actions",
        time_range: JSON.stringify(range),
        breakdowns: "publisher_platform,platform_position",
      });
      return toText(data);
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  AD SET LEVEL
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_list_adsets",
    "List all ad sets in a campaign with status and budget",
    {
      campaignId: z.string().describe("Campaign ID"),
    },
    wrapToolError(async (args) => {
      const { campaignId } = z
        .object({ campaignId: z.string() })
        .parse(args);
      const data = await client.get(`/${campaignId}/adsets`, {
        fields:
          "id,name,status,effective_status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event",
        limit: 100,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_adset_metrics",
    "Metrics for a specific ad set over a date range",
    {
      ...AdSetIdSchema.shape,
      ...DateRangeSchema.shape,
    },
    wrapToolError(async (args) => {
      const parsed = AdSetIdSchema.merge(DateRangeSchema).parse(args);
      const range = defaultDateRange(parsed.since, parsed.until);
      const data = await client.getInsights(parsed.adsetId, {
        fields: FULL_METRICS,
        time_range: JSON.stringify(range),
      });
      return toText(data);
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  AD LEVEL
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_list_ads",
    "List all ads in an ad set with status",
    {
      adsetId: z.string().describe("Ad set ID"),
    },
    wrapToolError(async (args) => {
      const { adsetId } = z.object({ adsetId: z.string() }).parse(args);
      const data = await client.get(`/${adsetId}/ads`, {
        fields: "id,name,status,effective_status,creative{id}",
        limit: 100,
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_ad_metrics",
    "Metrics for a specific ad over a date range",
    {
      ...AdIdSchema.shape,
      ...DateRangeSchema.shape,
    },
    wrapToolError(async (args) => {
      const parsed = AdIdSchema.merge(DateRangeSchema).parse(args);
      const range = defaultDateRange(parsed.since, parsed.until);
      const data = await client.getInsights(parsed.adId, {
        fields: FULL_METRICS,
        time_range: JSON.stringify(range),
      });
      return toText(data);
    })
  );

  server.tool(
    "meta_get_ad_creatives",
    "Get ad creative details: copy, images, links, call-to-action",
    {
      adId: z.string().describe("Ad ID"),
    },
    wrapToolError(async (args) => {
      const { adId } = z.object({ adId: z.string() }).parse(args);
      const data = await client.get(`/${adId}/adcreatives`, {
        fields:
          "id,name,title,body,image_url,image_hash,thumbnail_url,url_tags,call_to_action_type,link_url,object_story_spec",
        limit: 50,
      });
      return toText(data);
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  LEADS & CONVERSIONS
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_get_leads",
    "Get lead counts per campaign. Only counts Meta 'lead' action_type events.",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights<{
        data: Array<{
          campaign_name: string;
          campaign_id: string;
          spend: string;
          actions?: Array<{ action_type: string; value: string }>;
        }>;
      }>(accountId, {
        fields: "campaign_name,campaign_id,spend,actions",
        time_range: JSON.stringify(range),
        level: "campaign",
        limit: 100,
      });

      const campaigns = (data.data || []).map((c) => ({
        campaign_name: c.campaign_name,
        campaign_id: c.campaign_id,
        spend: parseFloat(c.spend || "0"),
        leads: parseLeads(c.actions),
        cost_per_lead:
          parseLeads(c.actions) > 0
            ? parseFloat(c.spend || "0") / parseLeads(c.actions)
            : null,
      }));

      const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);

      return toText({
        account: getAccountName(accountId),
        period: range,
        total_leads: totalLeads,
        total_spend: totalSpend,
        cost_per_lead: totalLeads > 0 ? totalSpend / totalLeads : null,
        campaigns: campaigns.filter((c) => c.leads > 0 || c.spend > 0),
      });
    })
  );

  server.tool(
    "meta_get_conversions",
    "Get all conversion action types and counts for an account",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights<{
        data: Array<{
          campaign_name: string;
          actions?: Array<{ action_type: string; value: string }>;
          action_values?: Array<{ action_type: string; value: string }>;
        }>;
      }>(accountId, {
        fields: "campaign_name,actions,action_values",
        time_range: JSON.stringify(range),
        level: "campaign",
        limit: 100,
      });

      return toText({
        account: getAccountName(accountId),
        period: range,
        campaigns: (data.data || []).map((c) => ({
          campaign_name: c.campaign_name,
          actions: c.actions || [],
          action_values: c.action_values || [],
        })),
      });
    })
  );

  server.tool(
    "meta_get_custom_conversions",
    "List custom conversions defined in an ad account",
    { ...AccountIdSchema.shape },
    wrapToolError(async (args) => {
      const { accountId } = AccountIdSchema.parse(args);
      const data = await client.get(`/${accountId}/customconversions`, {
        fields: "id,name,description,pixel,rule,default_conversion_value",
        limit: 100,
      });
      return toText(data);
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  E-COMMERCE (Polyalkemi)
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_get_ecommerce_report",
    "E-commerce report: revenue, ROAS, purchases per campaign. Best for Polyalkemi.",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights<{
        data: Array<{
          campaign_name: string;
          campaign_id: string;
          spend: string;
          actions?: Array<{ action_type: string; value: string }>;
          action_values?: Array<{ action_type: string; value: string }>;
          purchase_roas?: Array<{ action_type: string; value: string }>;
        }>;
      }>(accountId, {
        fields:
          "campaign_name,campaign_id,spend,impressions,clicks,ctr,actions,action_values,purchase_roas",
        time_range: JSON.stringify(range),
        level: "campaign",
        limit: 100,
      });

      const campaigns = (data.data || []).map((c) => {
        const spend = parseFloat(c.spend || "0");
        const revenue = parseRevenue(c.action_values);
        const purchases = c.actions?.find(
          (a) => a.action_type === "omni_purchase"
        );
        return {
          campaign_name: c.campaign_name,
          spend,
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
          purchases: purchases ? parseInt(purchases.value, 10) : 0,
        };
      });

      const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
      const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);

      return toText({
        account: getAccountName(accountId),
        period: range,
        total_spend: totalSpend,
        total_revenue: totalRevenue,
        total_roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        campaigns,
      });
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  ANOMALY DETECTION
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_detect_anomalies",
    "Flag campaigns with abnormal CPC, low CTR, or zero spend",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const data = await client.getInsights<{
        data: Array<{
          campaign_name: string;
          campaign_id: string;
          spend: string;
          impressions: string;
          clicks: string;
          ctr: string;
          cpc: string;
        }>;
      }>(accountId, {
        fields: "campaign_name,campaign_id,spend,impressions,clicks,ctr,cpc",
        time_range: JSON.stringify(range),
        level: "campaign",
        limit: 100,
      });

      // Also get active campaigns to find zero-spend ones
      const campaigns = await client.get<{
        data: Array<{
          id: string;
          name: string;
          effective_status: string;
        }>;
      }>(`/${accountId}/campaigns`, {
        fields: "id,name,effective_status",
        limit: 200,
      });

      const insights = data.data || [];
      const allCampaigns = campaigns.data || [];
      const activeCampaigns = allCampaigns.filter(
        (c) => c.effective_status === "ACTIVE"
      );

      // Calculate averages
      const avgCpc =
        insights.length > 0
          ? insights.reduce((s, c) => s + parseFloat(c.cpc || "0"), 0) /
            insights.length
          : 0;
      const avgCtr =
        insights.length > 0
          ? insights.reduce((s, c) => s + parseFloat(c.ctr || "0"), 0) /
            insights.length
          : 0;

      const anomalies: Array<{
        campaign: string;
        issue: string;
        severity: "high" | "medium" | "low";
        detail: string;
      }> = [];

      for (const c of insights) {
        const cpc = parseFloat(c.cpc || "0");
        const ctr = parseFloat(c.ctr || "0");
        const spend = parseFloat(c.spend || "0");

        if (cpc > avgCpc * 2 && cpc > 0) {
          anomalies.push({
            campaign: c.campaign_name,
            issue: "HIGH_CPC",
            severity: "high",
            detail: `CPC ${cpc.toFixed(2)} is ${(cpc / avgCpc).toFixed(1)}x the average (${avgCpc.toFixed(2)})`,
          });
        }
        if (ctr < avgCtr * 0.5 && parseFloat(c.impressions) > 100) {
          anomalies.push({
            campaign: c.campaign_name,
            issue: "LOW_CTR",
            severity: "medium",
            detail: `CTR ${ctr.toFixed(2)}% vs average ${avgCtr.toFixed(2)}%`,
          });
        }
        if (spend === 0 && parseFloat(c.impressions) === 0) {
          anomalies.push({
            campaign: c.campaign_name,
            issue: "ZERO_SPEND",
            severity: "low",
            detail: "No spend or impressions in period",
          });
        }
      }

      // Check for active campaigns with no insights at all
      const insightCampaignIds = new Set(
        insights.map((i) => i.campaign_id)
      );
      for (const c of activeCampaigns) {
        if (!insightCampaignIds.has(c.id)) {
          anomalies.push({
            campaign: c.name,
            issue: "ACTIVE_NO_DELIVERY",
            severity: "high",
            detail: "Campaign is ACTIVE but had no delivery in period",
          });
        }
      }

      return toText({
        account: getAccountName(accountId),
        period: range,
        anomaly_count: anomalies.length,
        benchmarks: {
          avg_cpc: avgCpc,
          avg_ctr: avgCtr,
        },
        anomalies,
      });
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  REPORT GENERATION
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_generate_report",
    "Generate a formatted performance report for an account with leads/revenue",
    { ...AccountDateSchema.shape },
    wrapToolError(async (args) => {
      const { accountId, since, until } = AccountDateSchema.parse(args);
      const range = defaultDateRange(since, until);
      const accountType = getAccountType(accountId);

      // Fetch account-level and campaign-level insights
      const [accountInsights, campaignInsights] = await Promise.all([
        client.getInsights<{
          data: Array<{
            spend: string;
            impressions: string;
            clicks: string;
            ctr: string;
            cpc: string;
            cpm: string;
            reach: string;
            frequency: string;
            actions?: Array<{ action_type: string; value: string }>;
            action_values?: Array<{ action_type: string; value: string }>;
          }>;
        }>(accountId, {
          fields:
            "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values",
          time_range: JSON.stringify(range),
          level: "account",
        }),
        client.getInsights<{
          data: Array<{
            campaign_name: string;
            campaign_id: string;
            spend: string;
            impressions: string;
            clicks: string;
            ctr: string;
            cpc: string;
            actions?: Array<{ action_type: string; value: string }>;
            action_values?: Array<{ action_type: string; value: string }>;
          }>;
        }>(accountId, {
          fields:
            "campaign_name,campaign_id,spend,impressions,clicks,ctr,cpc,actions,action_values",
          time_range: JSON.stringify(range),
          level: "campaign",
          limit: 100,
        }),
      ]);

      const account = accountInsights.data?.[0];
      const campaigns = campaignInsights.data || [];

      const report: Record<string, unknown> = {
        account: getAccountName(accountId),
        account_id: accountId,
        account_type: accountType,
        period: range,
        summary: account
          ? {
              spend: parseFloat(account.spend || "0"),
              impressions: parseInt(account.impressions || "0", 10),
              clicks: parseInt(account.clicks || "0", 10),
              ctr: parseFloat(account.ctr || "0"),
              cpc: parseFloat(account.cpc || "0"),
              cpm: parseFloat(account.cpm || "0"),
              reach: parseInt(account.reach || "0", 10),
              frequency: parseFloat(account.frequency || "0"),
            }
          : null,
      };

      if (accountType === "lead_gen") {
        const totalLeads = account ? parseLeads(account.actions) : 0;
        const totalSpend = account ? parseFloat(account.spend || "0") : 0;
        report.leads = {
          total: totalLeads,
          cost_per_lead: totalLeads > 0 ? totalSpend / totalLeads : null,
        };
      } else {
        const revenue = account ? parseRevenue(account.action_values) : 0;
        const spend = account ? parseFloat(account.spend || "0") : 0;
        report.ecommerce = {
          revenue,
          roas: spend > 0 ? revenue / spend : 0,
        };
      }

      report.campaigns = campaigns.map((c) => {
        const base: Record<string, unknown> = {
          name: c.campaign_name,
          id: c.campaign_id,
          spend: parseFloat(c.spend || "0"),
          impressions: parseInt(c.impressions || "0", 10),
          clicks: parseInt(c.clicks || "0", 10),
          ctr: parseFloat(c.ctr || "0"),
          cpc: parseFloat(c.cpc || "0"),
        };
        if (accountType === "lead_gen") {
          base.leads = parseLeads(c.actions);
        } else {
          base.revenue = parseRevenue(c.action_values);
        }
        return base;
      });

      return toText(report);
    })
  );

  server.tool(
    "meta_compare_periods",
    "Compare metrics across two date ranges for an account",
    {
      accountId: z
        .string()
        .describe("Meta ad account ID (format: act_123456789)"),
      since1: z.string().describe("Period 1 start date (YYYY-MM-DD)"),
      until1: z.string().describe("Period 1 end date (YYYY-MM-DD)"),
      since2: z.string().describe("Period 2 start date (YYYY-MM-DD)"),
      until2: z.string().describe("Period 2 end date (YYYY-MM-DD)"),
    },
    wrapToolError(async (args) => {
      const { accountId, since1, until1, since2, until2 } = z
        .object({
          accountId: z.string(),
          since1: z.string(),
          until1: z.string(),
          since2: z.string(),
          until2: z.string(),
        })
        .parse(args);

      const fields =
        "spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,action_values";

      const [period1, period2] = await Promise.all([
        client.getInsights<{
          data: Array<Record<string, unknown>>;
        }>(accountId, {
          fields,
          time_range: JSON.stringify({
            since: since1,
            until: until1,
          }),
          level: "account",
        }),
        client.getInsights<{
          data: Array<Record<string, unknown>>;
        }>(accountId, {
          fields,
          time_range: JSON.stringify({
            since: since2,
            until: until2,
          }),
          level: "account",
        }),
      ]);

      const p1 = period1.data?.[0] || {};
      const p2 = period2.data?.[0] || {};

      const metrics = [
        "spend",
        "impressions",
        "clicks",
        "ctr",
        "cpc",
        "cpm",
        "reach",
        "frequency",
      ];

      const comparison: Record<string, unknown> = {};
      for (const m of metrics) {
        const v1 = parseFloat((p1[m] as string) || "0");
        const v2 = parseFloat((p2[m] as string) || "0");
        comparison[m] = {
          period1: v1,
          period2: v2,
          change: v2 - v1,
          change_pct: v1 > 0 ? ((v2 - v1) / v1) * 100 : null,
        };
      }

      return toText({
        account: getAccountName(accountId),
        period1: { since: since1, until: until1 },
        period2: { since: since2, until: until2 },
        comparison,
      });
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  MULTI-ACCOUNT OVERVIEW
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_all_accounts_report",
    "Get a combined overview of all managed accounts for a date range",
    { ...DateRangeSchema.shape },
    wrapToolError(async (args) => {
      const { since, until } = DateRangeSchema.parse(args);
      const range = defaultDateRange(since, until);

      const results = await Promise.all(
        Object.values(ACCOUNTS).map(async (account) => {
          try {
            const data = await client.getInsights<{
              data: Array<{
                spend: string;
                impressions: string;
                clicks: string;
                ctr: string;
                cpc: string;
                actions?: Array<{ action_type: string; value: string }>;
                action_values?: Array<{
                  action_type: string;
                  value: string;
                }>;
              }>;
            }>(account.id, {
              fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
              time_range: JSON.stringify(range),
              level: "account",
            });

            const d = data.data?.[0];
            const spend = d ? parseFloat(d.spend || "0") : 0;
            const result: Record<string, unknown> = {
              account: account.name,
              account_id: account.id,
              type: account.type,
              spend,
              impressions: d ? parseInt(d.impressions || "0", 10) : 0,
              clicks: d ? parseInt(d.clicks || "0", 10) : 0,
              ctr: d ? parseFloat(d.ctr || "0") : 0,
              cpc: d ? parseFloat(d.cpc || "0") : 0,
            };

            if (account.type === "lead_gen") {
              const leads = d ? parseLeads(d.actions) : 0;
              result.leads = leads;
              result.cost_per_lead = leads > 0 ? spend / leads : null;
            } else {
              const revenue = d ? parseRevenue(d.action_values) : 0;
              result.revenue = revenue;
              result.roas = spend > 0 ? revenue / spend : 0;
            }

            return result;
          } catch (error) {
            return {
              account: account.name,
              account_id: account.id,
              error:
                error instanceof Error ? error.message : String(error),
            };
          }
        })
      );

      const totalSpend = results.reduce(
        (s, r) => s + (typeof r.spend === "number" ? r.spend : 0),
        0
      );

      return toText({
        period: range,
        total_spend: totalSpend,
        accounts: results,
      });
    })
  );

  // ═══════════════════════════════════════════════════════════
  //  WRITE OPERATIONS (human-in-the-loop via MCP confirm)
  // ═══════════════════════════════════════════════════════════

  server.tool(
    "meta_pause_campaign",
    "Pause a campaign (requires confirmation). Sets status to PAUSED.",
    {
      campaignId: z.string().describe("Campaign ID to pause"),
    },
    wrapToolError(async (args) => {
      const { campaignId } = z
        .object({ campaignId: z.string() })
        .parse(args);
      const data = await client.post(`/${campaignId}`, {
        status: "PAUSED",
      });
      return toText({ success: true, campaignId, new_status: "PAUSED", response: data });
    })
  );

  server.tool(
    "meta_resume_campaign",
    "Resume a paused campaign (requires confirmation). Sets status to ACTIVE.",
    {
      campaignId: z.string().describe("Campaign ID to resume"),
    },
    wrapToolError(async (args) => {
      const { campaignId } = z
        .object({ campaignId: z.string() })
        .parse(args);
      const data = await client.post(`/${campaignId}`, {
        status: "ACTIVE",
      });
      return toText({ success: true, campaignId, new_status: "ACTIVE", response: data });
    })
  );

  server.tool(
    "meta_update_budget",
    "Update daily budget for a campaign (in NOK). Input is in kroner, converted to øre for the API.",
    {
      campaignId: z.string().describe("Campaign ID"),
      dailyBudgetNok: z
        .number()
        .describe("New daily budget in NOK (e.g. 165 for 165 kr)"),
    },
    wrapToolError(async (args) => {
      const { campaignId, dailyBudgetNok } = z
        .object({
          campaignId: z.string(),
          dailyBudgetNok: z.number(),
        })
        .parse(args);
      const budgetInOre = Math.round(dailyBudgetNok * 100);
      const data = await client.post(`/${campaignId}`, {
        daily_budget: budgetInOre,
      });
      return toText({
        success: true,
        campaignId,
        daily_budget_nok: dailyBudgetNok,
        daily_budget_ore: budgetInOre,
        response: data,
      });
    })
  );
}
