import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { startReadmeGeneration, getReadmeGenerationStatus, cancelReadmeGeneration } from "@/utils/jobManger";
import { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
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
    isAuthenticated: Boolean!
  }
    
  enum JobStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }
`;

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
    
    async userApiUsage(_: unknown, __: unknown, context: { userId: string | null; clientIp: string }) {
      try {
        return await getUserApiUsage(context.userId, context.clientIp);
      } catch (error) {
        console.error("Error in userApiUsage resolver:", error);
        // Return a fallback response to prevent breaking the UI
        return {
          remaining: 0,
          limit: context.userId ? 5 : 2,
          reset: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
          isAuthenticated: !!context.userId
        };
      }
    },

    // Simple health check resolver for testing the API
    healthCheck() {
      return "GraphQL API is working!";
    }
  },
  
  Mutation: {
    async startReadmeJob(_: unknown, { repoUrl }: { repoUrl: string }, context: { userId: string | null; clientIp: string }) {
      try {
        // Check rate limit first
        try {
          const ratelimit = await checkRateLimit(context.userId, context.clientIp);
          
          if (!ratelimit.success) {
            return {
              success: false,
              jobId: null,
              error: `Rate limit exceeded. Try again after ${new Date(Date.now() + ratelimit.reset).toLocaleString()}.`
            };
          }
        } catch (rateError) {
          console.error("Rate limit check failed:", rateError);
          // Continue despite rate limit error
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
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Export a Next.js API Handler with context
// Export a Next.js API Handler with context
const handler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    try {
      // Get user authentication information from Clerk
      let userId = null;
      try {
        const auth = getAuth(req);
        userId = auth.userId;
      } catch (clerkError) {
        console.warn("Clerk auth not available:", clerkError);
        // Continue without auth - user will be treated as guest
      }
      
      // Get client IP for guest rate limiting
      const forwarded = req.headers instanceof Headers && typeof req.headers.get === "function" ? req.headers.get("x-forwarded-for") : null;
      const clientIp = forwarded ?
        forwarded.split(",")[0] :
        (req.headers instanceof Headers && typeof req.headers.get === "function" ? req.headers.get("x-real-ip") : null) || "unknown";
      
      return {
        userId,
        clientIp
      };
    } catch (error) {
      console.error("Error creating context:", error);
      return {
        userId: null,
        clientIp: "unknown"
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
    return await handler(request);
}