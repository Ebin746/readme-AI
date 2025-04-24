// app/api/graphql/route.ts
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { startReadmeGeneration, getReadmeGenerationStatus } from "@/utils/jobManger";
import { NextRequest } from "next/server";

// Define GraphQL Schema
const typeDefs = gql`
  type Query {
    readmeJob(jobId: String!): ReadmeJobStatus!
  }

  type Mutation {
    startReadmeJob(repoUrl: String!): ReadmeJobResponse!
  }

  type ReadmeJobResponse {
    success: Boolean!
    jobId: String
    error: String
  }

  type ReadmeJobStatus {
    jobId: String!
    status: JobStatus!
    content: String
    error: String
    progress: Float
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
      return await getReadmeGenerationStatus(jobId);
    }
  },
  Mutation: {
    async startReadmeJob(_: unknown, { repoUrl }: { repoUrl: string }) {
      try {
        const jobId = await startReadmeGeneration(repoUrl);
        return { success: true, jobId, error: null };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        return { success: false, jobId: null, error: errorMessage };
      }
    },
  },
};

// Create Apollo Server Instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Export a Next.js API Handler
const handler = startServerAndCreateNextHandler(server);

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}