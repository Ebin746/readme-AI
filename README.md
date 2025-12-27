# 🚀 readme-AI
[![Node.js Version](https://img.shields.io/badge/node->=18.17.0-brightgreen)](https://nodejs.org/)

*An AI-powered web application for generating comprehensive GitHub README files from repository URLs.*

## ✨ Features

- **AI-driven Generation:** Automatically creates detailed READMEs by analyzing GitHub repository content.
- **Asynchronous Job Processing:** Handles README generation tasks in the background with real-time progress updates.
- **Real-time Status Tracking:** Utilizes WebSockets (via [Supabase][supabase]) and polling for live job status and progress display.
- **User Authentication:** Integrates [Clerk][clerk] for secure user management and personalized experiences.
- **API Usage Monitoring:** Tracks and displays daily API generation limits for both authenticated and unauthenticated users.
- **Interactive UI:** Provides a user-friendly interface for inputting repository URLs, monitoring progress, and copying generated content.
- **Robust Error Handling:** Displays clear error messages for invalid URLs, API failures, and other issues.

## 💻 Tech Stack

| Category         | Technologies                          |
|:-----------------|:--------------------------------------|
| Frontend         | [React][react], [Next.js][nextjs], [Tailwind CSS][tailwind] |
| Backend & API    | [Node.js][nodejs], [Apollo Server][apollo], [GraphQL][graphql], [Supabase][supabase] |
| AI / NLP         | [Google Generative AI][google-gemini], [Compromise][compromise] |
| Database         | [Supabase][supabase]                  |
| Tools & Language | [TypeScript][typescript], [ESLint][eslint], [PostCSS][postcss] |
| Authentication   | [Clerk][clerk]                        |
| Deployment       | [Vercel][vercel]                      |

## 🚀 Quick Start

To get this project up and running locally, follow these steps.

### Prerequisites

Ensure you have the following installed:

- [Node.js][nodejs] (version 18.17.0 or higher)
- [npm][npm] (Node Package Manager) or [Yarn][yarn] or [pnpm][pnpm]

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/readme-ai.git # Replace with actual repo URL
   cd readme-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   # or yarn install
   # or pnpm install
   ```

### Environment Variables

Create a `.env.local` file in the root directory and add the following environment variables. Obtain these from your [Supabase][supabase] project settings.

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

> [!NOTE]
> Additional environment variables related to [Clerk][clerk] or [Google Generative AI][google-gemini] might be required based on your specific setup. Refer to the respective documentation for details.

## ⚙️ Development

### Scripts

The following scripts are available for development:

```bash
npm run dev     # Starts the development server
npm run build   # Builds the application for production
npm run start   # Starts the built application
npm run lint    # Runs ESLint to check for code quality issues
```

## 📚 API Reference

The application exposes a [GraphQL][graphql] endpoint for handling README generation and status queries.

| Method | Endpoint      | Description                                     |
|:-------|:--------------|:------------------------------------------------|
| `POST` | `/api/graphql` | Main GraphQL endpoint for all API interactions. |

### Key GraphQL Operations

- **`mutation StartReadmeJob($repoUrl: String!)`**: Initiates the README generation process for a given repository URL.
- **`query ReadmeJob($jobId: String!)`**: Fetches the current status, progress, and content of a specific README generation job.
- **`mutation CancelReadmeJob($jobId: String!)`**: Attempts to cancel an ongoing README generation job.
- **`query GetApiUsage`**: Retrieves the API usage statistics for the current user, including remaining generations and reset time.

## ☁️ Deployment

This project is configured for deployment on [Vercel][vercel]. A `vercel.json` file is present in the root directory.

To deploy your instance:

1. Link your GitHub repository to [Vercel][vercel].
2. [Vercel][vercel] will automatically detect the [Next.js][nextjs] project and deploy it.
3. Ensure your [environment variables](#environment-variables) are configured correctly on [Vercel][vercel].

[react]: https://react.dev
[nextjs]: https://nextjs.org
[tailwind]: https://tailwindcss.com
[nodejs]: https://nodejs.org
[npm]: https://www.npmjs.com
[yarn]: https://yarnpkg.com
[pnpm]: https://pnpm.io
[apollo]: https://www.apollographql.com/docs/apollo-server
[graphql]: https://graphql.org
[supabase]: https://supabase.com
[google-gemini]: https://ai.google.dev/models/gemini
[compromise]: https://compromise.dev
[typescript]: https://www.typescriptlang.org
[eslint]: https://eslint.org
[postcss]: https://postcss.org
[clerk]: https://clerk.com
[vercel]: https://vercel.com
[uuid]: https://www.npmjs.com/package/uuid
[react-markdown]: https://www.npmjs.com/package/react-markdown
