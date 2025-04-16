import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { generateReadmeFromRepo } from "@/utils/readmeGenerator";
import { NextRequest } from "next/server";

// Define GraphQL Schema
const typeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    generateReadme(repoUrl: String!): ReadmeResponse
  }

  type ReadmeResponse {
    success: Boolean!
    content: String
    error: String
  }
`;

// Define Resolvers
const resolvers = {
  Mutation: {
    async generateReadme(_: unknown, { repoUrl }: { repoUrl: string }) {
      try {
        const content = await generateReadmeFromRepo(repoUrl);
        return { success: true, content, error: null };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : "An unknown error occurred";
        return { success: false, content: null, error: errorMessage };
      }
    },
  },
};

// Create Apollo Server Instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Create the Next.js handler
const apolloHandler = startServerAndCreateNextHandler(server);

// Define the GET and POST handlers with correct parameters
export async function GET(request: NextRequest) {
  return apolloHandler(request);
}

export async function POST(request: NextRequest) {
  return apolloHandler(request);
}