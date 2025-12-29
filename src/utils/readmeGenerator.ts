import { GoogleGenerativeAI } from "@google/generative-ai";
import extractContent from "@/utils/extractiveSummarization";
import { excludeList, excludeExtensions } from "@/utils/excludingList";

const GITHUB_API_BASE = "https://api.github.com/repos";


interface GitHubFile {
  type: "file" | "dir";
  path: string;
  name: string;
  download_url?: string; // Only present for files
}

// Improved function to fetch repo contents using tree API
async function fetchRepoContents(
  owner: string,
  repo: string,
  signal: AbortSignal,
  updateProgress?: (progress: number) => Promise<void>
): Promise<GitHubFile[]> {
  // Get the default branch first
  const repoResponse = await fetch(`${GITHUB_API_BASE}/${owner}/${repo}`, {
    headers: {
      "User-Agent": "Next.js App",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    signal,
    cache: "force-cache",
  });

  const repoData = await repoResponse.json();
  const defaultBranch = repoData.default_branch;

  if (updateProgress) await updateProgress(0.1); // 10% progress

  // Use the tree API with recursive flag for better performance
  const treeUrl = `${GITHUB_API_BASE}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
  const response = await fetch(treeUrl, {
    headers: {
      "User-Agent": "Next.js App",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
    signal,
    cache: "force-cache",
  });

  if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
  const data = await response.json();

  if (updateProgress) await updateProgress(0.2); // 20% progress

  // Only return actual files, not directories, and filter out excluded files
  return data.tree
    .filter((item: { type: string; path: string; }) =>
      item.type === "blob" &&
      !excludeList.some(ex => item.path.includes(ex)) &&
      !excludeExtensions.some(ext => item.path.endsWith(ext))
    )
    .map((item: { path: string; }) => ({
      type: "file",
      path: item.path,
      name: item.path.split('/').pop() || "",
      download_url: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`
    }));
}

async function fetchFileContent(downloadUrl: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(downloadUrl, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to fetch file content from ${downloadUrl}`);
  return response.text();
}

// Add progress callback parameter
export async function generateReadmeFromRepo(
  repoUrl: string,
  progressCallback?: (progress: number) => Promise<void>,
  signal: AbortSignal = new AbortController().signal
): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid repository URL format");

  const [, githubUser, repoName] = match;

  // Get all files using the optimized tree API
  const filesList = await fetchRepoContents(githubUser, repoName, signal, progressCallback);

  if (progressCallback) await progressCallback(0.3); // 30% progress

  // Create file list for README
  let readmeContent = `# ${repoName}\n\n## File List\n\n`;
  filesList.forEach(file => {
    readmeContent += `- ${file.path}\n`;
  });

  if (progressCallback) await progressCallback(0.4); // 40% progress

  // Determine important files to analyze
  // Focus on key files that reveal project structure
  const keyFiles = ['package.json', '.eslintrc', 'tsconfig.json'];
  const sourceFiles = ['.js', '.jsx', '.ts', '.tsx', '.md'];

  const priorityFiles = filesList.filter(file =>
    keyFiles.includes(file.name) || keyFiles.some(key => file.path.includes(key))
  );

  // Add some representative source files
  const sourceCodeFiles = filesList
    .filter(file => sourceFiles.some(ext => file.path.endsWith(ext)))
    .filter(file => !file.path.includes('node_modules') && !file.path.includes('dist'))
    .slice(0, 10); // Limit to 10 source files

  // Combine priority files with source files
  const filesToFetch = [...priorityFiles, ...sourceCodeFiles].slice(0, 15);

  // Fetch file contents in parallel
  const contentPromises = filesToFetch.map(async (file, index) => {
    try {
      const content = await fetchFileContent(file.download_url!, signal);
      if (progressCallback) {
        // Update progress from 40% to 70% during file fetching
        await progressCallback(0.4 + (index / filesToFetch.length) * 0.3);
      }
      return { path: file.path, content };
    } catch (error) {
      console.error(`Error fetching ${file.path}:`, error);
      return { path: file.path, content: "" };
    }
  });

  const fileContents = await Promise.all(contentPromises);
  const codeFiles: Record<string, string> = {};
  fileContents.forEach(({ path, content }) => {
    codeFiles[path] = content;
  });

  if (progressCallback) await progressCallback(0.7); // 70% progress

  readmeContent += `\n## File Contents\n\n`;
  const extractedContent = extractContent(JSON.stringify(codeFiles));

  if (progressCallback) await progressCallback(0.8);

  const prompt = `You are an expert technical documentation specialist with 10+ years of experience creating professional, publication-ready README files for open-source projects. Your task is to analyze the provided project data and generate a flawless, GitHub-ready README.md.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL OUTPUT REQUIREMENTS — FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

🚫 FORBIDDEN:
- NEVER wrap the entire output in \`\`\`markdown or any code fence
- NO placeholder text like "[Your description here]" or "Coming soon"
- NO generic filler content — every sentence must be project-specific
- NO broken Markdown syntax (unclosed brackets, misaligned tables, etc.)
- NO ### headers for main sections (use ## only)

✅ REQUIRED:
- Output ONLY pure GitHub Flavored Markdown
- Use semantic structure with proper heading hierarchy
- Include ONLY sections with actual, verifiable information
- Professional, technical tone — no marketing hype or casual language
- All technical details must be accurate and inferred from provided files

═══════════════════════════════════════════════════════════════════════════════
MARKDOWN FORMATTING STANDARDS
═══════════════════════════════════════════════════════════════════════════════

### Heading Structure:
- Use exactly ONE # for the project title
- Use exactly ## for ALL main sections
- Use ### ONLY for sub-sections within a main section (rare)
- Add one blank line before each ## header
- Add two blank lines after major sections for clean visual separation

### Table Formatting (CRITICAL):
All tables MUST follow this exact pattern:

| Column 1       | Column 2                              | Column 3    |
|----------------|---------------------------------------|-------------|
| Left-aligned   | Left-aligned text here                | Left-align  |
| Another row    | More content with proper spacing      | Value       |

Rules:
- Use 3-5 dashes per column (e.g., --- or ----), NEVER long repetitive dashes
- Pipes | at the start and end of EVERY row
- Pad cells with spaces for visual alignment in source
- Left-align by default (:--- or ---), right-align numbers (---:), center if needed (:---:)
- NO broken pipes, NO misaligned columns, NO extra spaces after final pipe

### Technology Links:
- Display clean names in tables (e.g., "React", "Next.js", "TypeScript")
- Add reference links at the END of the README (after License section):

[react]: https://react.dev
[nextjs]: https://nextjs.org
[typescript]: https://www.typescriptlang.org
[tailwind]: https://tailwindcss.com
[nodejs]: https://nodejs.org

- Make technology names clickable where appropriate using reference style

### Code Blocks:
- Use \`\`\`bash for shell commands
- Use \`\`\`typescript, \`\`\`javascript, etc. for code samples
- Always specify the language for syntax highlighting
- Include comments in code examples for clarity

### Badges:
- Use shields.io badges for version, license, build status, etc.
- Place badges in a single row under the title
- Example: ![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

### GitHub Alerts:
Use for important notes or warnings:
> [!NOTE]
> This is a note for important information.

> [!WARNING]
> This is a warning for critical information.

═══════════════════════════════════════════════════════════════════════════════
README STRUCTURE — INCLUDE ONLY IF RELEVANT
═══════════════════════════════════════════════════════════════════════════════

Follow this order strictly, but OMIT any section if there's no verifiable data:

## 1. Project Title & Overview
Format:
# 🚀 [Project Name]

[Badge row with shields.io]

> *One concise sentence describing the project's core purpose*

Brief paragraph (2-3 sentences) expanding on what the project does and why it exists.

## 2. ✨ Features
- Include ONLY if you can identify 5+ specific, real features from the code
- Use emoji bullet points for visual appeal
- Group related features under sub-headings if needed
- Be specific and technical, not generic

Example:
## ✨ Features

### 🔧 Core Functionality
- ⚡ Real-time data synchronization with WebSocket support
- 🔐 JWT-based authentication with refresh token rotation
- 📊 Advanced analytics dashboard with customizable widgets

### 🎨 User Experience
- 🌓 Dark/light theme with system preference detection
- 📱 Fully responsive design (mobile-first approach)

## 3. 🛠️ Tech Stack
- ALWAYS include if package.json is detected
- Use a clean, well-formatted table
- Infer technologies from dependencies, imports, and file structure
- Group by category (Frontend, Backend, Database, DevOps, Tools, etc.)

Example:
## 🛠️ Tech Stack

| Category        | Technologies                                          |
|-----------------|-------------------------------------------------------|
| Frontend        | [React], [Next.js], [Tailwind CSS]        |
| Backend         | [Node.js], [Express], [GraphQL]                      |
| Database        | [PostgreSQL], [Redis]                                |
| Authentication  | [Clerk], JWT                                         |
| DevOps          | [Docker], [GitHub Actions], [Vercel]                 |
| Testing         | [Jest], [React Testing Library], [Playwright]        |
| Code Quality    | [TypeScript], [ESLint], [Prettier]                   |

## 4. 🚀 Quick Start

### Prerequisites
- Include ONLY if you can determine versions from package.json or other config files
- List required software with specific versions

Example:
- Node.js >= 18.0.0
- npm >= 9.0.0 or yarn >= 1.22.0
- PostgreSQL >= 14.0 (if database detected)

### Installation
\`\`\`bash
# Clone the repository
git clone https://github.com/[owner]/[repo].git

# Navigate to project directory
cd [repo]

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
\`\`\`

### Environment Variables
- Include ONLY if .env.example exists OR if you can infer required variables from code
- Use a table format for clarity

Example:
Create a \`.env\` file in the root directory:

| Variable               | Description                          | Required |
|------------------------|--------------------------------------|----------|
| \`DATABASE_URL\`       | PostgreSQL connection string         | Yes      |
| \`NEXT_PUBLIC_API_URL\` | API base URL                        | Yes      |
| \`JWT_SECRET\`         | Secret for JWT token generation      | Yes      |
| \`REDIS_URL\`          | Redis connection URL                 | No       |

### Running the Application
\`\`\`bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Run tests
npm test
\`\`\`

## 5. 💻 Development

### Available Scripts
- Extract from package.json scripts section
- Explain what each script does

Example:
| Script          | Description                                      |
|-----------------|--------------------------------------------------|
| \`npm run dev\`   | Starts development server on port 3000          |
| \`npm run build\` | Creates optimized production build              |
| \`npm run test\`  | Runs test suite with Jest                       |
| \`npm run lint\`  | Runs ESLint to check code quality               |

### Project Structure
- Include ONLY if you can infer a clear, logical structure
- Keep it high-level (don't list every file)

Example:
\`\`\`
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable React components
├── lib/              # Utility functions and helpers
├── hooks/            # Custom React hooks
├── types/            # TypeScript type definitions
└── utils/            # General utilities
\`\`\`

## 6. 📡 API Reference
- Include ONLY if you detect clear API endpoints (e.g., /api folder, Express routes, OpenAPI spec)
- Use a clean table format

Example:
## 📡 API Reference

### Authentication
| Method | Endpoint           | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| POST   | \`/api/auth/login\`  | User login                   | No            |
| POST   | \`/api/auth/signup\` | Create new account           | No            |
| POST   | \`/api/auth/logout\` | User logout                  | Yes           |

### Users
| Method | Endpoint           | Description                  | Auth Required |
|--------|-------------------|------------------------------|---------------|
| GET    | \`/api/users/:id\`   | Get user by ID               | Yes           |
| PUT    | \`/api/users/:id\`   | Update user profile          | Yes           |
| DELETE | \`/api/users/:id\`   | Delete user account          | Yes           |

## 7. 🧪 Testing
- Include ONLY if test files or testing scripts are detected
- Mention testing framework and how to run tests

Example:
\`\`\`bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
\`\`\`

## 8. 🚢 Deployment
- Include platform-specific instructions if deployment config detected
- Mention environment requirements

Example for Next.js:
### Deploy to Vercel
1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Deploy

### Docker Deployment
- Include ONLY if Dockerfile exists

\`\`\`bash
# Build image
docker build -t [project-name] .

# Run container
docker run -p 3000:3000 [project-name]
\`\`\`

## 9. 🤝 Contributing
- Include ONLY if CONTRIBUTING.md exists OR if you detect PR templates, commit conventions
- Keep brief and link to detailed guides if they exist

Example:
Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

### Commit Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- \`feat:\` New features
- \`fix:\` Bug fixes
- \`docs:\` Documentation changes
- \`style:\` Code style changes (formatting, etc.)
- \`refactor:\` Code refactoring
- \`test:\` Adding or updating tests
- \`chore:\` Maintenance tasks

## 10. 📄 License
- Include ONLY if LICENSE file is detected
- State the license type clearly

Example:
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 11. 👥 Authors & Acknowledgments
- Include ONLY if you can extract author info from package.json or other metadata
- Keep it concise

Example:
Created by [@username](https://github.com/username)

Special thanks to:
- [Contributor 1](https://github.com/contributor1) - Feature X
- [Contributor 2](https://github.com/contributor2) - Bug fixes

═══════════════════════════════════════════════════════════════════════════════
ANALYSIS GUIDELINES
═══════════════════════════════════════════════════════════════════════════════

1. **Be Detective-Like**: Analyze the provided files carefully to infer:
   - Project type (web app, CLI tool, library, etc.)
   - Main framework/technology (React, Vue, Express, etc.)
   - Dependencies and their purposes
   - Architecture patterns (REST, GraphQL, microservices, etc.)
   - Testing strategy (unit, integration, E2E)

2. **Be Honest**: If you can't determine something, DON'T include it
   - No placeholder sections
   - No generic "Coming soon" content
   - Only include what you can verify from the provided data

3. **Be Specific**: Use actual values from the project:
   - Real package names and versions from package.json
   - Actual script commands
   - Real file/folder names
   - Specific technology versions

4. **Be Professional**: 
   - Technical accuracy over marketing speak
   - Clear, concise explanations
   - Proper technical terminology
   - No excessive emojis (use sparingly for visual hierarchy)

═══════════════════════════════════════════════════════════════════════════════
PROJECT DATA FOR ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

### File Structure & Metadata:
\`\`\`
${readmeContent}
\`\`\`

### Extracted Code Content:
\`\`\`
${extractedContent}
\`\`\`

═══════════════════════════════════════════════════════════════════════════════
FINAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate a publication-ready README.md that:
✅ Renders perfectly on GitHub (test all Markdown syntax)
✅ Contains ONLY verified, project-specific information
✅ Uses proper table formatting with aligned columns
✅ Includes working reference links at the end
✅ Follows all formatting standards exactly as specified
✅ Has a professional, technical tone suitable for open-source
✅ Adapts structure based on project type and available data
✅ Omits any section without sufficient supporting evidence

Begin generating the README now. Output ONLY the Markdown content, starting with the # title.`;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const reply = result.response.text();
  return reply;
}