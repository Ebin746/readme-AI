import { Redis } from '@upstash/redis';

// Initialize Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Rate limit configuration - per identifier (device or ip)
const RATE_LIMIT_PER_IDENTIFIER = 5; // 5 requests per day per device/ip
const RATE_LIMIT_WINDOW = 86400; // 24 hours in seconds

export async function checkRateLimit(clientKey: string): Promise<{ success: boolean; reset: number }> {
  try {
    // clientKey should be like 'device:<id>' or 'ip:<addr>'
    const key = `rate_limit:${clientKey}`;
    const limit = RATE_LIMIT_PER_IDENTIFIER;

    // Get current count
    const count = (await redis.get<number>(key)) || 0;

    // Get TTL
    const ttl = await redis.ttl(key);

    // If this is a new key or expired key, reset the count
    if (count === 0 || ttl <= 0) {
      await redis.set(key, 1, { ex: RATE_LIMIT_WINDOW });
      return { success: true, reset: 0 };
    }

    if (count >= limit) {
      return { success: false, reset: ttl * 1000 }; // Convert seconds to milliseconds
    }

    // Increment the counter
    await redis.incr(key);
    return { success: true, reset: 0 };
  } catch (error) {
    // Log error but don't block the request
    console.error('Rate limit check failed:', error);
    return { success: true, reset: 0 };
  }
}

export async function getUserApiUsage(clientKey: string): Promise<{
  remaining: number;
  limit: number;
  reset: string;
}> {
  try {
    const key = `rate_limit:${clientKey}`;
    const limit = RATE_LIMIT_PER_IDENTIFIER;

    // Get current count
    const count = (await redis.get<number>(key)) || 0;

    // Get TTL
    const ttl = await redis.ttl(key);

    const resetDate = new Date(Date.now() + (ttl <= 0 ? RATE_LIMIT_WINDOW : ttl) * 1000);

    return {
      remaining: Math.max(0, limit - count),
      limit,
      reset: resetDate.toISOString(),
    };
  } catch (error) {
    console.error('Failed to get API usage:', error);

    // Return a default value
    return {
      remaining: RATE_LIMIT_PER_IDENTIFIER,
      limit: RATE_LIMIT_PER_IDENTIFIER,
      reset: new Date(Date.now() + RATE_LIMIT_WINDOW * 1000).toISOString(),
    };
  }
}