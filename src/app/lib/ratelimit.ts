import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client for rate limiting
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Create two rate limiters - one for authenticated users, one for guests
export const authenticatedRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 d"), // 10 requests per day
  analytics: true,
  prefix: "ratelimit:authenticated",
});

export const guestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(2, "1 d"), // 2 requests per day
  analytics: true,
  prefix: "ratelimit:guest",
});

/**
 * Check if a user has exceeded their rate limit
 * @param userId User ID for authenticated users, or null for guests
 * @param clientIp IP address for guest users
 * @returns Object containing success status and reset time
 */
export async function checkRateLimit(userId: string | null, clientIp: string) {
  const isAuthenticated = !!userId;
  const limiter = isAuthenticated ? authenticatedRatelimit : guestRatelimit;
  const identifier = isAuthenticated ? userId : clientIp || "anonymous";
  
  return await limiter.limit(identifier);
}

/**
 * Get usage information for a user
 * @param userId User ID for authenticated users, or null for guests
 * @param clientIp IP address for guest users 
 * @returns Usage information including remaining requests and limit
 */
// lib/ratelimit.ts
// In your ratelimit.ts file, ensure getUserApiUsage only gets the count without incrementing

export async function getUserApiUsage(userId: string | null, clientIp: string) {
  const isAuthenticated = !!userId;
  const limiter = isAuthenticated
    ? authenticatedRatelimit
    : guestRatelimit;
  const identifier = isAuthenticated
    ? userId!
    : clientIp || "anonymous";

  try {
    // This only gets the remaining count without incrementing
    const { remaining, reset } = await limiter.getRemaining(identifier);
    
    return {
      remaining,
      limit: isAuthenticated ? 10 : 2,
      reset: new Date(reset).toISOString(),
      isAuthenticated,
    };
  } catch (error) {
    console.error("Error getting rate limit info:", error);
    // Fallback values if there's an error
    return {
      remaining: isAuthenticated ? 10 : 2,
      limit: isAuthenticated ? 10 : 2,
      reset: new Date(Date.now() + 86400000).toISOString(),
      isAuthenticated,
    };
  }
}