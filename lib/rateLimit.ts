interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  lookupRateLimitStore?: Map<string, RateLimitEntry>;
};

const store: Map<string, RateLimitEntry> =
  globalForRateLimit.lookupRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalForRateLimit.lookupRateLimitStore) {
  globalForRateLimit.lookupRateLimitStore = store;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * In-memory sliding rate limiter per IP address or identifier.
 * Default: 10 requests per 5 minutes per IP.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 5 * 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  if (entry.count >= config.maxRequests) {
    const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetSeconds,
    };
  }

  entry.count += 1;
  const resetSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetSeconds,
  };
}

export function clearRateLimitStore(): void {
  store.clear();
}
