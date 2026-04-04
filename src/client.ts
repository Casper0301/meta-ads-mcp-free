const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export class MetaApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
    public errorCode?: number
  ) {
    super(`Meta API error ${status} ${statusText}: ${body}`);
    this.name = "MetaApiError";
  }
}

interface CacheEntry {
  data: unknown;
  expires: number;
}

export class MetaAdsClient {
  private token: string;
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs: number;

  // Rate limiting: track call timestamps
  private callTimestamps: number[] = [];
  private maxCallsPerMinute = 30; // conservative — well under Meta's 200/hr

  constructor(token: string, cacheTtlMs = 5 * 60 * 1000) {
    this.token = token;
    this.cacheTtlMs = cacheTtlMs;
  }

  private getCached(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.data;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expires: Date.now() + this.cacheTtlMs });
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 60_000;
    this.callTimestamps = this.callTimestamps.filter((t) => t > windowStart);

    if (this.callTimestamps.length >= this.maxCallsPerMinute) {
      const waitUntil = this.callTimestamps[0] + 60_000;
      const waitMs = waitUntil - now;
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
    this.callTimestamps.push(Date.now());
  }

  async get<T = unknown>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${GRAPH_API_BASE}${path}`);
    url.searchParams.set("access_token", this.token);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const cacheKey = url.toString();
    const cached = this.getCached(cacheKey);
    if (cached !== undefined) return cached as T;

    await this.throttle();

    const response = await fetch(url.toString());

    if (!response.ok) {
      const body = await response.text();
      let errorCode: number | undefined;
      try {
        const parsed = JSON.parse(body);
        errorCode = parsed?.error?.code;
      } catch {}
      throw new MetaApiError(response.status, response.statusText, body, errorCode);
    }

    const data = (await response.json()) as T;
    this.setCache(cacheKey, data);
    return data;
  }

  async getInsights<T = unknown>(
    objectId: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): Promise<T> {
    return this.get<T>(`/${objectId}/insights`, params);
  }
}
