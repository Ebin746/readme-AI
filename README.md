
# 🤖 README-AI

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/your-username/readme-ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/your-username/readme-ai/actions)

A tool to automatically generate README.md files for your GitHub repositories using AI.

## Features

- 🔧 **Core Features**:
    - Automatically generates README files from GitHub repository URLs.
    - Analyzes project structure and tech stack to create accurate documentation.
    - Utilizes AI to create a professional and informative README content.
- 🚀 **Deployment**:
    - Simple to deploy on various platforms like Vercel.
- 🔒 **Security**:
    - Securely clones repositories without requiring authentication.
- ✨ **User Experience**:
    - User-friendly interface for generating README files quickly.
    - Copies README content to clipboard with a single click.
- ⚙️ **Customization**:
    - Generates README files based on specific project guidelines.

## Tech Stack

| Category     | Technologies                        |
|--------------|-------------------------------------|
| Frontend     | [React][react-url], [Next.js][nextjs-url], [Tailwind CSS][tailwindcss-url] |
| Backend      | [Node.js][nodejs-url], [Next.js API Routes][nextjs-api-url]  |
| AI           | [Google Generative AI][gemini-url]              |
| Other        | [React Markdown][react-markdown-url]        |

## Quick Start

### Prerequisites

- Node.js (>=18)
- npm (>=9) or yarn (>=1)
- Google Cloud Account and API key for Google Generative AI (Gemini)

> [!NOTE]
> Ensure that you have set up the necessary environment variables before proceeding.

### Installation

bash
git clone [repo-url]
cd project
npm install
# or
yarn install


### Environment

Create a `.env.local` file in the root directory with the following variables:

env
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY


### Development

#### Commands

bash
npm run dev    # Start development server
# or
yarn dev

npm run build  # Create production build
# or
yarn build

npm run lint   # Run linters
# or
yarn lint

npm run start  # Start production server
# or
yarn start


#### Testing

The project uses ESLint for linting.  Currently, there are no dedicated unit or integration tests set up in the project.

## API Reference

| Method | Endpoint            | Body                       | Response                       |
|--------|---------------------|----------------------------|--------------------------------|
| POST   | `/api/fetch-repo`   | `{ repoUrl: string }`      | `{ success: boolean, message: string, repo: string }` \| `{ error: string }` |
| POST   | `/api/generate-readme` | `{}`                       | `{ reply: string }` \| `{ error: string }`       |

## Deployment

### Vercel

The easiest way to deploy this Next.js app is to use the [Vercel Platform][vercel-url].  Simply push your code to a GitHub repository and import it into Vercel.  Vercel automatically detects that it is a Next.js project and deploys it.

### Dockerfile

The project does not contain a Dockerfile. Here's an example of how to create one if Dockerization is desired:

dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]


## Contributing

We welcome contributions to the project!

- **Branch Naming**: Use descriptive branch names such as `feat/new-feature`, `bugfix/issue-123`, or `chore/update-dependencies`.
- **Commit Messages**: Follow the [Conventional Commits][conventional-commits-url] specification.
- **PR Template**:
  - Provide a clear and concise description of the changes.
  - Reference any related issues or pull requests.
  - Include screenshots or videos if the changes involve UI updates.
  - Ensure that the code is properly linted and formatted.

[react-url]: https://react.dev/
[nextjs-url]: https://nextjs.org/
[nodejs-url]: https://nodejs.org/en
[express-url]: https://expressjs.com/
[mongodb-url]: https://www.mongodb.com/
[mongoose-url]: https://mongoosejs.com/
[docker-url]: https://www.docker.com/
[tailwindcss-url]: https://tailwindcss.com/
[conventional-commits-url]: https://www.conventionalcommits.org/en/v1.0.0/
[vercel-url]: https://vercel.com/
[nextjs-api-url]: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
[gemini-url]: https://ai.google.dev/
[react-markdown-url]: https://github.com/remarkjs/react-markdown
