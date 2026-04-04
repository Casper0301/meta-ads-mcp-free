import { z } from "zod";

export const AccountIdSchema = z.object({
  accountId: z
    .string()
    .describe("Meta ad account ID (format: act_123456789)"),
});

export const DateRangeSchema = z.object({
  since: z
    .string()
    .optional()
    .describe("Start date (YYYY-MM-DD). Defaults to 7 days ago."),
  until: z
    .string()
    .optional()
    .describe("End date (YYYY-MM-DD). Defaults to today."),
});

export const AccountDateSchema = AccountIdSchema.merge(DateRangeSchema);

export const CampaignIdSchema = z.object({
  campaignId: z.string().describe("Campaign ID"),
});

export function defaultDateRange(since?: string, until?: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return {
    since: since || sevenDaysAgo.toISOString().split("T")[0],
    until: until || now.toISOString().split("T")[0],
  };
}
