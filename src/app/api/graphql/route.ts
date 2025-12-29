import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { startReadmeGeneration, getReadmeGenerationStatus, cancelReadmeGeneration } from "@/utils/jobManger";
import { NextRequest } from "next/server";
import { checkRateLimit, getUserApiUsage } from "../../lib/ratelimit";

// Define GraphQL Schema
const typeDefs = gql`
  type Query {
    readmeJob(jobId: String!): ReadmeJobStatus!
    userApiUsage: ApiUsageInfo!
    healthCheck: String!
  }
    
  type Mutation {
    startReadmeJob(repoUrl: String!): ReadmeJobResponse!
    cancelReadmeJob(jobId: String!): CancelJobResponse!
  }
    
  type ReadmeJobResponse {
    success: Boolean!
    jobId: String
    error: String
  }
    
  type CancelJobResponse {
    success: Boolean!
    error: String
  }
    
  type ReadmeJobStatus {
    jobId: String!
    status: JobStatus!
    content: String
    error: String
    progress: Float
  }
    
  type ApiUsageInfo {
    remaining: Int!
    limit: Int!
    reset: String
  }
    
  enum JobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }
`;

interface Context {
  // clientKey is of the form `device:<deviceId>` or `ip:<ipAddress>`
  clientKey: string;
}

// Helper function to get client IP
function getClientIp(req: { headers?: { get?: (name: string) => string | null } & Record<string, string | string[] | undefined> }): string {
  try {
    // Abstract header access so this works for NextRequest (Headers) and NextApiRequest (plain object)
    const getHeader = (name: string) => {
      if (!req.headers) return undefined;
      if (typeof req.headers.get === 'function') {
        return req.headers.get(name);
      } else {
        const val = (req.headers as Record<string, string | string[]>)[name];
        return Array.isArray(val) ? val[0] : val;
      }
    };

    const cfConnectingIp = getHeader('cf-connecting-ip');
    const xRealIp = getHeader('x-real-ip');
    const xForwardedFor = getHeader('x-forwarded-for');

    if (cfConnectingIp) return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    if (xRealIp) return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;

    if (xForwardedFor) {
      const forwarded = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
      return forwarded.split(',')[0].trim();
    }
  } catch (e) {
    console.error('Failed to extract client IP:', e);
  }

  return 'unknown';
}

// Define Resolvers
const resolvers = {
  Query: {
    async readmeJob(_: unknown, { jobId }: { jobId: string }) {
      try {
        return await getReadmeGenerationStatus(jobId);
      } catch (error) {
        console.error("Error in readmeJob resolver:", error);
        return {
          jobId,
          status: "FAILED",
          error: error instanceof Error ? error.message : "An unknown error occurred",
          progress: 0
        };
      }
    },
    
    async userApiUsage(_: unknown, __: unknown, context: Context) {
      try {
        return await getUserApiUsage(context.clientKey);
      } catch (error) {
        console.error("Error in userApiUsage resolver:", error);
        // Return a fallback response to prevent breaking the UI
        return {
          remaining: 0,
          limit: 5,
          reset: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        };
      }
    },

    // Simple health check resolver for testing the API
    healthCheck() {
      return "GraphQL API is working!";
    }
  },
  
  Mutation: {
    async startReadmeJob(_: unknown, { repoUrl }: { repoUrl: string }, context: Context) {
      try {
        // Check rate limit first
        try {
          const rateLimit = await checkRateLimit(context.clientKey);
          
          if (!rateLimit.success) {
            const resetDate = new Date(Date.now() + rateLimit.reset);
            const resetMinutes = Math.ceil(rateLimit.reset / 1000 / 60);
            return {
              success: false,
              jobId: null,
              error: `Rate limit exceeded. Please try again in ${resetMinutes} minutes (resets at ${resetDate.toLocaleTimeString()}).`
            };
          }
        } catch (rateError) {
          console.error("Rate limit check failed:", rateError);
          // Continue despite rate limit error to avoid blocking legitimate users
        }
        
        const jobId = await startReadmeGeneration(repoUrl);
        return { success: true, jobId, error: null };
      } catch (err: unknown) {
        console.error("Error starting README job:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return { success: false, jobId: null, error: errorMessage };
      }
    },
    
    async cancelReadmeJob(_: unknown, { jobId }: { jobId: string }) {
      try {
        const success = await cancelReadmeGeneration(jobId);
        return {
          success,
          error: success ? null : "Failed to cancel job or job not found"
        };
      } catch (err: unknown) {
        console.error("Error cancelling job:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return { success: false, error: errorMessage };
      }
    }
  },
};

// Create Apollo Server Instance
const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
});

// Export a Next.js API Handler with context
const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    try {
      // Get client IP for rate limiting
      const clientIp = getClientIp(req);

      // Parse device id from cookie if present (set client-side)
      // Support both NextRequest (Headers) and NextApiRequest/IncomingMessage style headers
      let cookieHeader = '';
      if (req.headers && typeof (req.headers as Record<string, unknown>).get === 'function') {
        cookieHeader = (((req.headers as Record<string, unknown>).get as (key: string) => string)('cookie') as string) || '';
      } else if (req.headers && 'cookie' in req.headers) {
        cookieHeader = (req.headers.cookie as string) || '';
      }
      const getCookieFromHeader = (name: string) => {
        if (!cookieHeader) return null;
        const match = cookieHeader.split(';').map((c: string) => c.trim()).find((c: string) => c.startsWith(name + '='));
        if (!match) return null;
        return decodeURIComponent(match.split('=')[1] || '');
      };

      const deviceId = getCookieFromHeader('rm_device_id');
      // Build a clientKey that clearly indicates the identifier type
      const clientKey = deviceId ? `device:${deviceId}` : `ip:${clientIp}`;

      return {
        clientKey
      };
    } catch (error) {
      console.error("Error creating context:", error);
      return {
        clientKey: `ip:unknown`
      };
    }
  },
});

export async function GET(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error) {
    console.error("GraphQL GET error:", error);
    return new Response(JSON.stringify({
      errors: [{ message: "Internal server error" }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handler(request);
  } catch (error) {
    console.error("GraphQL POST error:", error);
    return new Response(JSON.stringify({
      errors: [{ message: "Internal server error" }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}