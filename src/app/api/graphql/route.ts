import { NextRequest } from "next/server";
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { generateReadmeFromRepo } from "@/utils/readmeGenerator";

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

const resolvers = {
  Mutation: {
    async generateReadme(_: unknown, { repoUrl }: { repoUrl: string }) {
      try {
        const content = await generateReadmeFromRepo(repoUrl);
        return { success: true, content, error: null };
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred";
        return { success: false, content: null, error: errorMessage };
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Explicitly define the handler function to match the expected signature
const handler = startServerAndCreateNextHandler<NextRequest>(server, {
  context: async () => {
    // You can add custom context logic here if needed
    return {};
  },
});

export { handler as GET, handler as POST };