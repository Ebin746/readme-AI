// app/api/graphql/route.ts
import { NextRequest } from "next/server";
import { ApolloServer } from "@apollo/server";
import { startServerAndCreateNextHandler } from "@as-integrations/next";
import { gql } from "graphql-tag";
import { generateReadmeFromRepo } from "@/utils/readmeGenerator"; // We'll move your core logic here

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
    async generateReadme(_: any, { repoUrl }: { repoUrl: string }) {
      try {
        const content = await generateReadmeFromRepo(repoUrl);
        return { success: true, content, error: null };
      } catch (err: any) {
        return { success: false, content: null, error: err.message };
      }
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const handler = startServerAndCreateNextHandler<NextRequest>(server);
export { handler as GET, handler as POST };
