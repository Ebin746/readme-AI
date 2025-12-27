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

  const prompt = `You are a senior technical writer specializing in creating clean, professional, and visually perfect open-source README files. Generate a complete, publication-ready README.md for the analyzed project.

### Critical Output Rules
- Output ONLY pure GitHub Flavored Markdown. NEVER wrap the entire output in '''markdown, ''', or any code block.
- Use exactly one # for the main project title.
- Use exactly ## for ALL section headers. Never use ### or higher unless for rare sub-sub-sections.
- Add exactly one blank line before each ## header and two blank lines after sections for clean spacing.
- Professional, neutral tone. No hype or casual language.

### Table Formatting (CRITICAL — Follow Exactly)
- All tables MUST use proper alignment:
  - Left-align most columns: :----
  - Center if needed: :----:
  - Right-align numbers/versions: ----:
- Use MINIMAL dashes: exactly 3-5 per column (e.g., --- or ----). NEVER generate long repetitive dashes.
- Ensure pipes | are present at start and end of every row.
- Pad cells with spaces for visual source alignment (e.g., | Category     | Technologies                          |).
- Example perfect Tech Stack table:
- Display ONLY the clean technology names in the table — NO [label] references visible.
- Example of correct visible table:
  | Category   | Technologies                          |
  |------------|---------------------------------------|
  | Frontend   | React, Next.js, Tailwind CSS          |
  | Backend    | Node.js, Express                      |
  | Database   | MongoDB, PostgreSQL                   |
  | Tools      | TypeScript, ESLint, Prettier          |
  | Deployment | Vercel, Docker                        |

- At the very end of the README (after License), add reference links like:
  [react]: https://react.dev
  [nextjs]: https://nextjs.org
  [tailwind]: https://tailwindcss.com
  [nodejs]: https://nodejs.org
  [express]: https://expressjs.com
  etc.

- The model must infer correct official URLs for each technology.
- User must see only clean names (e.g., Next.js) that are clickable links.
### README Structure (Strict Order — Include Only If Relevant)

1. **Project Title**
   - # with one relevant emoji + project name
   - Shields.io badges row (Node version, license, etc.)
   - One-line italic description

2. **Features**
   - 5–7 key features in bullets
   - Group under emoji subheadings if helpful (e.g., 🔧 Core Features)

3. **Tech Stack**
   - ALWAYS include if package.json or files detected
   - Use the exact table format above with reference links at bottom

4. **Quick Start**
   - **Prerequisites** (Node.js version, etc.)
   - **Installation** (git clone, npm/yarn/pnpm install)
   - **Environment Variables** (only if detected or common ones needed)

5. **Development**
   - **Scripts** from package.json in '''bash block
   - Testing section only if test files/scripts detected

6. **API Reference**
   - Include ONLY if backend routes/endpoints clearly detected (e.g., /api folder, Express routes)
   - Simple Method | Endpoint | Description table

7. **Deployment**
   - Recommended platforms (Vercel for Next.js, etc.)
   - Include Dockerfile in code block ONLY if present in files

8. **Contributing**
   - Include ONLY if CONTRIBUTING.md, PR template, or conventional commits detected
   - Keep brief: branch naming, commit convention

9. **License**
   - Always include if LICENSE file detected

### Conditional Sections
- Omit any section entirely if no relevant evidence in project files (e.g., no API → skip API Reference; no Dockerfile → skip it; no tests → skip Testing).

### Style & Links
- Use reference-style links, defined at the very end:
  [react]: https://react.dev
  [nextjs]: https://nextjs.org
- Use GitHub alerts for notes:
  > [!NOTE]
  > Important info here.

### Project Analysis
Use this data accurately:
       
       ### **Project Analysis**
       \`\`\`
       ${readmeContent}
       \`\`\`
       \`\`\`
       ${extractedContent}
       \`\`\`
       
       Generate a publication-ready README with exact technical accuracy. Omit placeholders. Maintain a framework-agnostic structure suitable for any modern web project. Ensure the output is flexible and adapts to the provided project files (e.g., package.json) to infer the tech stack, versions, and dependencies dynamically. The README should professional
       
Generated README should perfect markdown rendering on GitHub: clean tables, correct headings, no broken pipes/dashes, and professional layout.
       `;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);
  const reply = result.response.text();
  return reply;
}