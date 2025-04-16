import { GoogleGenerativeAI } from "@google/generative-ai";
import extractContent from "@/utils/extractiveSummarization";
import { excludeList, excludeExtensions } from "@/utils/excludingList";

const GITHUB_API_BASE = "https://api.github.com/repos";

// Define the type for GitHub API file/directory response
interface GitHubFile {
  type: "file" | "dir";
  path: string;
  name: string;
  download_url?: string; // Only present for files
}

async function fetchGitHubFiles(owner: string, repo: string, path = ""): Promise<GitHubFile[]> {
  const url = `${GITHUB_API_BASE}/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Next.js App",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    },
  });
  if (!response.ok) throw new Error(`GitHub API Error: ${response.statusText}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Unexpected GitHub API response");

  let files: GitHubFile[] = [];
  for (const item of data) {
    if (item.type === "dir") {
      const subFiles = await fetchGitHubFiles(owner, repo, item.path);
      files = files.concat(subFiles);
    } else {
      files.push(item as GitHubFile);
    }
  }
  return files;
}

async function fetchFileContent(downloadUrl: string): Promise<string> {
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error("Failed to fetch file content");
  return response.text();
}

export async function generateReadmeFromRepo(repoUrl: string): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid repository URL format");

  const [, githubUser, repoName] = match;
  let readmeContent = `# ${repoName}\n\n## File List\n\n`;
  const codeFiles: Record<string, string> = {};

  const filesList = await fetchGitHubFiles(githubUser, repoName);
  for (const file of filesList) {
    if (
      file.type === "file" &&
      !excludeList.some(ex => file.path.includes(ex)) &&
      !excludeExtensions.some(ext => file.name.endsWith(ext))
    ) {
      const content = await fetchFileContent(file.download_url!); // `download_url` is guaranteed for files
      readmeContent += `- ${file.path}\n`;
      codeFiles[file.path] = content;
    }
  }

  readmeContent += `\n## File Contents\n\n`;
  const extractedContent = extractContent(JSON.stringify(codeFiles));

  const prompt = `
       You are a senior technical writer creating professional documentation. Generate a polished and flexible README.md for a modern web project (e.g., Next.js, MERN stack, or similar). Follow these guidelines:
       
       ### **README Structure**
       1. **Project Title**  
          - Name with 1 relevant emoji prefix
          - Shields.io badges (version, license, build status, etc.)
          - Concise 1-line description
       
       2. **Features**  
          - 5-7 key capabilities as bullet points
          - Use emoji-led categories (e.g., 🔧 Core Features, 🚀 Deployment, 🔒 Security)
       
       3. **Tech Stack**  
          - Analyze the provided project files (e.g., package.json) to infer the technologies used.
          - Organize the tech stack into a categorized table with official docs links:
            | Category       | Technologies                          |
            |----------------|---------------------------------------|
            | Frontend       | (e.g., React, Next.js)                |
            | Backend        | (e.g., Node.js, Express)              |
            | Database       | (e.g., MongoDB, Mongoose)             |
            | DevOps         | (e.g., Docker, GitHub Actions)        |
          - Include any other relevant libraries or frameworks.
       
       4. **Quick Start**  
          - **Prerequisites**: List required software and versions (e.g., Node.js, MongoDB).
          - **Installation**:
            \`\`\`bash
            git clone [repo-url]
            cd project
            npm install
            \`\`\`
          - **Environment**: List required environment variables:
            \`\`\`env
            PORT=3000
            DB_URI=mongodb://localhost:27017/app
            \`\`\`
       
       5. **Development**  
          - **Commands**: Include common development commands (e.g., start, build, test).
            \`\`\`bash
            npm run dev    # Start development
            npm run build  # Create production build
            npm run test   # Run tests
            \`\`\`
          - **Testing**: Outline the test strategy (unit, integration, E2E).
       
       6. **API Reference** (if applicable)
          - Endpoint table with parameters and examples:
            | Method | Endpoint       | Body                   | Response              |
            |--------|----------------|------------------------|-----------------------|
            | POST   | /api/users     | { name: "John" }       | 201 Created          |
       
       7. **Deployment**  
          - **Dockerfile** (if applicable):
            \`\`\`dockerfile
            FROM node:18-alpine
            WORKDIR /app
            COPY . .
            RUN npm install
            CMD ["npm", "start"]
            \`\`\`
          - Platform guides (e.g., Vercel, Heroku, AWS).
       
       8. **Contributing**  
          - Branch naming convention (e.g., feat/bugfix/chore).
          - Commit message standards.
          - PR template requirements.
       
       ### **Formatting Rules**
       - Use GitHub-flavored markdown.
       - All code in triple backticks with language specification.
       - Tables must align with pipes.
       - Section headers use h2 (##) level.
       - Admonitions formatted as:
         > [!NOTE]
         > Important configuration note.
       
       ### **Style Requirements**
       - Neutral professional tone (no colloquialisms).
       - Consistent spacing between sections.
       - All external links in reference-style:
         [Express][express-url]
       
       ### **Technical Specifications**
       - Analyze the provided project files (e.g., package.json) to infer:
         - Required software versions (e.g., Node.js, MongoDB).
         - Dependencies and devDependencies.
         - Scripts defined in package.json.
         - Environment variables.
         - CI/CD configuration (if detected).
       - Include both npm and yarn commands where applicable.
       
       ### **Project Analysis**
       \`\`\`
       ${readmeContent}
       \`\`\`
       \`\`\`
       ${extractedContent}
       \`\`\`
       
       Generate a publication-ready README with exact technical accuracy. Omit placeholders. Maintain a framework-agnostic structure suitable for any modern web project. Ensure the output is flexible and adapts to the provided project files (e.g., package.json) to infer the tech stack, versions, and dependencies dynamically. The README should professional
       `;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const reply = result.response.text();
  return reply;
}