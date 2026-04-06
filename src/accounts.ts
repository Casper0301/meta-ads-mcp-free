export interface AdAccount {
  id: string;
  name: string;
  type: "lead_gen" | "ecommerce";
}

export const ACCOUNTS: Record<string, AdAccount> = {
  act_14246673: {
    id: "act_14246673",
    name: "Naka Autosport",
    type: "lead_gen",
  },
  act_996950670679944: {
    id: "act_996950670679944",
    name: "Stjørdal Autosalg",
    type: "lead_gen",
  },
  act_753487635197711: {
    id: "act_753487635197711",
    name: "Aasen Auto",
    type: "lead_gen",
  },
  act_3929508630480150: {
    id: "act_3929508630480150",
    name: "Hanebrekke Service",
    type: "lead_gen",
  },
  act_703535410118805: {
    id: "act_703535410118805",
    name: "Polyalkemi",
    type: "ecommerce",
  },
};

export const LEAD_ACTION_TYPES = ["lead"];

export function getAccountName(accountId: string): string {
  return ACCOUNTS[accountId]?.name ?? accountId;
}

export function getAccountType(accountId: string): "lead_gen" | "ecommerce" {
  return ACCOUNTS[accountId]?.type ?? "lead_gen";
}

export function parseBudget(rawBudget: string | number): number {
  return Number(rawBudget) / 100;
}

export function parseLeads(
  actions?: Array<{ action_type: string; value: string }>
): number {
  if (!actions) return 0;
  return actions
    .filter((a) => LEAD_ACTION_TYPES.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value, 10), 0);
}

export function parseRevenue(
  actionValues?: Array<{ action_type: string; value: string }>
): number {
  if (!actionValues) return 0;
  const purchase = actionValues.find(
    (a) => a.action_type === "omni_purchase"
  );
  return purchase ? parseFloat(purchase.value) : 0;
}
