
# 🤖 readme-ai [![version](https://img.shields.io/badge/version-0.0-blue.svg)](https://github.com/your-username/readme-ai) [![license](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT) [![build](https://img.shields.io/github/actions/workflow/status/your-username/readme-ai/main.yml?branch=main)](https://github.com/your-username/readme-ai/actions)

Automatically generate comprehensive README files for your GitHub repositories.

## Features

*   🔧 **Core Features:**
    *   Automatically generates README content from a GitHub repository URL.
    *   Provides a progress display during the generation process.
    *   Supports cancellation of the generation process.
    *   Allows users to copy the generated README content to their clipboard.
*   🔒 **Authentication & Authorization:**
    *   Integrates with Clerk for user authentication.
    *   Offers API usage tracking with rate limiting via Upstash.
*   🚀 **Deployment:**
    *   Configured for deployment on Vercel.
    *   Uses Supabase for real-time job status updates.
*   ✨ **AI Integration:**
    *   Extractive summarization using `compromise` library.
    *   Uses Google's Generative AI for README content generation.

## Tech Stack

| Category   | Technologies                                                               |
|------------|----------------------------------------------------------------------------|
| Frontend   | [Next.js][nextjs-url], [React][react-url], [tailwindcss][tailwindcss-url]              |
| Backend    | [Node.js][nodejs-url], [GraphQL][graphql-url], [Apollo Server][apollo-url]                               |
| Database   | [Supabase][supabase-url]                                                       |
| AI        | [Google Generative AI][gemini-url], [Compromise][compromise-url]  |
| State Management| [Clerk][clerk-url]  |
| DevOps     | [Vercel][vercel-url], [GitHub Actions][github-actions-url]                                       |
| Rate Limiting  | [Upstash][upstash-url]              |
| Other      | [react-markdown][react-markdown-url]                               |

## Quick Start

### Prerequisites

*   Node.js (>=18)
*   npm (>=8) or yarn (>=1.22)
*   GitHub Account & Personal Access Token
*   Clerk Account
*   Upstash Account
*   Supabase Account
*   Google Generative AI API Key

> [!NOTE]
> Ensure you have set up your environment variables correctly before proceeding.

### Installation

bash
git clone [repo-url]
cd readme-ai
npm install # or yarn install


### Environment

Create a `.env.local` file and add the following environment variables:

env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
GOOGLE_API_KEY=your_google_api_key


## Development

### Commands

bash
npm run dev    # Start development server
npm run build  # Create a production build
npm run start  # Start the production server
npm run lint   # Run ESLint


or using yarn:

bash
yarn dev    # Start development server
yarn build  # Create a production build
yarn start  # Start the production server
yarn lint   # Run ESLint


### Testing

This project does not include a dedicated test suite, but unit tests can be added. The `eslint` script can be used as a basic code quality check.

## API Reference

The application uses a GraphQL API. Here's a brief overview:

| Method | Endpoint      | Body                                                     | Response                                                              |
|--------|---------------|----------------------------------------------------------|-----------------------------------------------------------------------|
| POST   | `/api/graphql` | `{ "query": "...", "variables": { ... } }`              | `200 OK` with JSON payload containing data or errors.                   |

### Example Queries:

#### Start Readme Job

graphql
mutation StartReadmeJob($repoUrl: String!) {
  startReadmeJob(repoUrl: $repoUrl) {
    success
    jobId
    error
  }
}


#### Cancel Readme Job

graphql
mutation CancelReadmeJob($jobId: String!) {
  cancelReadmeJob(jobId: $jobId) {
    success
    error
  }
}


#### Get Readme Job

graphql
query ReadmeJob($jobId: String!) {
  readmeJob(jobId: $jobId) {
    status
    progress
    content
    error
  }
}


#### Get User Api Usage

graphql
query GetApiUsage {
  userApiUsage {
    remaining
    limit
    reset
    isAuthenticated
  }
}


## Deployment

### Vercel

This project is configured for easy deployment to [Vercel][vercel-url]. Simply connect your GitHub repository to Vercel, and the necessary build steps will be automatically configured.

### Docker (Optional)

Although not directly included, a Dockerfile can be created:

dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]


## Contributing

We welcome contributions to `readme-ai`! Please follow these guidelines:

*   **Branch Naming:** Use descriptive branch names: `feat/new-feature`, `bugfix/issue-123`, or `chore/update-dependencies`.
*   **Commit Messages:** Use clear and concise commit messages.
*   **Pull Requests:** Submit pull requests with detailed descriptions of the changes and their purpose.

> [!NOTE]
> All contributions must adhere to the project's code style and conventions.

[nextjs-url]: https://nextjs.org/docs
[react-url]: https://reactjs.org/docs/getting-started.html
[tailwindcss-url]: https://tailwindcss.com/docs
[nodejs-url]: https://nodejs.org/en/docs/
[graphql-url]: https://graphql.org/
[apollo-url]: https://www.apollographql.com/docs/apollo-server/
[supabase-url]: https://supabase.com/docs
[gemini-url]: https://ai.google.dev/
[compromise-url]: https://compromise.cool/
[clerk-url]: https://clerk.com/docs
[vercel-url]: https://vercel.com/docs
[github-actions-url]: https://docs.github.com/en/actions
[upstash-url]: https://upstash.com/docs
[react-markdown-url]: https://github.com/remarkjs/react-markdown
