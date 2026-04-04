import { MetaApiError } from "./client.js";

export function toText(data: unknown): { content: { type: "text"; text: string }[] } {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function wrapToolError(
  fn: (args: unknown) => Promise<{ content: { type: "text"; text: string }[] }>
) {
  return async (args: unknown) => {
    try {
      return await fn(args);
    } catch (error) {
      if (error instanceof MetaApiError) {
        return toText({
          error: `Meta API Error ${error.status}`,
          message: error.body,
          errorCode: error.errorCode,
          hint:
            error.status === 190
              ? "Access token has expired or is invalid. Generate a new token in Meta Business Manager."
              : error.status === 17
              ? "Rate limit reached. Wait a moment and try again."
              : undefined,
        });
      }
      const msg = error instanceof Error ? error.message : String(error);
      return toText({ error: msg });
    }
  };
}
