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
  const keyFiles = ['package.json', '.eslintrc', 'tsconfig.json', 'README.md', 'next.config.js'];
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