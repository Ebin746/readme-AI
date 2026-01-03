import { GoogleGenerativeAI } from "@google/generative-ai";
import { excludeList, excludeExtensions } from "@/utils/excludingList";
import { generateEmbeddings, generateQueryEmbedding, FileWithContent } from "@/utils/embedder";
import { selectFilesWithMMR, DEFAULT_MMR_CONFIG, README_GENERATION_QUERY } from "@/utils/mmrSelector";
import { buildReadmeContext, buildFileListSummary, DEFAULT_CONTEXT_CONFIG } from "@/utils/readmeContextBuilder";

const GITHUB_API_BASE = "https://api.github.com/repos";

interface GitHubFile {
  type: "file" | "dir";
  path: string;
  name: string;
  download_url?: string;
}

/**
 * Fetches repository contents using GitHub tree API
 */
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

  if (updateProgress) await updateProgress(0.05);

  // Use the tree API with recursive flag
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

  if (updateProgress) await updateProgress(0.1);

  // Filter and return files
  return data.tree
    .filter((item: { type: string; path: string }) =>
      item.type === "blob" &&
      !excludeList.some(ex => item.path.includes(ex)) &&
      !excludeExtensions.some(ext => item.path.endsWith(ext))
    )
    .map((item: { path: string }) => ({
      type: "file",
      path: item.path,
      name: item.path.split('/').pop() || "",
      download_url: `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${item.path}`
    }));
}

/**
 * Fetches content of a single file
 */
async function fetchFileContent(downloadUrl: string, signal: AbortSignal): Promise<string> {
  const response = await fetch(downloadUrl, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to fetch file content from ${downloadUrl}`);
  return response.text();
}

/**
 * Main function to generate README from repository
 */
export async function generateReadmeFromRepo(
  repoUrl: string,
  progressCallback?: (progress: number) => Promise<void>,
  signal: AbortSignal = new AbortController().signal
): Promise<string> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid repository URL format");

  const [, githubUser, repoName] = match;

  // Step 1: Get all files (10% progress)
  const filesList = await fetchRepoContents(githubUser, repoName, signal, progressCallback);
  if (progressCallback) await progressCallback(0.15);

  // Step 2: Identify important files to fetch
  const keyFiles = [
  'README.md',
  'package.json',
  'pubspec.yaml',
  'pom.xml',
  'build.gradle',
  'go.mod',
  'Cargo.toml',
  'requirements.txt'
];
  const sourceExtensions = [
  '.js','.jsx','.ts','.tsx',
  '.dart','.py','.go','.java',
  '.rs','.cpp','.c','.md','.yaml'
];

  const priorityFiles = filesList.filter(file =>
    keyFiles.some(key => file.path.toLowerCase().includes(key.toLowerCase()))
  );

  const sourceCodeFiles = filesList
    .filter(file => sourceExtensions.some(ext => file.path.endsWith(ext)))
    .filter(file => !file.path.includes('node_modules') && !file.path.includes('dist'))
    .slice(0, 20); // Fetch up to 20 source files

  const filesToFetch = [...new Set([...priorityFiles, ...sourceCodeFiles])].slice(0, 25);

  if (progressCallback) await progressCallback(0.2);

  // Step 3: Fetch file contents in parallel (20% -> 40%)
  const contentPromises = filesToFetch.map(async (file, index) => {
    try {
      const content = await fetchFileContent(file.download_url!, signal);
      if (progressCallback) {
        await progressCallback(0.2 + (index / filesToFetch.length) * 0.2);
      }
      return { path: file.path, content };
    } catch (error) {
      console.error(`Error fetching ${file.path}:`, error);
      return null;
    }
  });

  const fileContentsRaw = await Promise.all(contentPromises);
  const fileContents: FileWithContent[] = fileContentsRaw.filter(
    (f): f is FileWithContent => f !== null
  );

  if (progressCallback) await progressCallback(0.4);

  // Step 4: Generate embeddings (40% -> 55%)
  console.log(`Generating embeddings for ${fileContents.length} files...`);
  const filesWithEmbeddings = await generateEmbeddings(fileContents, signal);
  
  if (progressCallback) await progressCallback(0.55);

  // Step 5: Generate query embedding and select files with MMR (55% -> 65%)
  console.log("Selecting most relevant files using MMR...");
  const queryEmbedding = await generateQueryEmbedding(README_GENERATION_QUERY);
  
  const selectedFiles = selectFilesWithMMR(
    filesWithEmbeddings,
    queryEmbedding,
    DEFAULT_MMR_CONFIG
  );

  console.log(`Selected ${selectedFiles.length} files for README generation:`, 
    selectedFiles.map(f => f.path)
  );

  if (progressCallback) await progressCallback(0.65);

  // Step 6: Build context for LLM (65% -> 70%)
  const fileListSummary = buildFileListSummary(filesList.map(f => f.path));
  const selectedFilesContext = buildReadmeContext(selectedFiles, DEFAULT_CONTEXT_CONFIG);

  if (progressCallback) await progressCallback(0.7);

  // Step 7: Generate README with LLM (70% -> 95%)
  const prompt = `You are an expert technical documentation specialist with 10+ years of experience creating professional, publication-ready README files for open-source projects. Your task is to analyze the provided project data and generate a flawless, GitHub-ready README.md.

═══════════════════════════════════════════════════════════════════════════════
CRITICAL OUTPUT REQUIREMENTS – FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════════════════

🚫 FORBIDDEN:
- NEVER wrap the entire output in \`\`\`markdown or any code fence
- NO placeholder text like "[Your description here]" or "Coming soon"
- NO generic filler content – every sentence must be project-specific
- NO broken Markdown syntax (unclosed brackets, misaligned tables, etc.)
- NO ### headers for main sections (use ## only)

✅ REQUIRED:
- Output ONLY pure GitHub Flavored Markdown
- Use semantic structure with proper heading hierarchy
- Include ONLY sections with actual, verifiable information
- Professional, technical tone – no marketing hype or casual language
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

### Code Blocks:
- Use \`\`\`bash for shell commands
- Use \`\`\`typescript, \`\`\`javascript, etc. for code samples
- Always specify the language for syntax highlighting
- Include comments in code examples for clarity

### Badges:
- Use shields.io badges for version, license, build status, etc.
- Place badges in a single row under the title
- Example: ![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

═══════════════════════════════════════════════════════════════════════════════
README STRUCTURE – INCLUDE ONLY IF RELEVANT
═══════════════════════════════════════════════════════════════════════════════

Follow this order strictly, but OMIT any section if there's no verifiable data:

## 1. Project Title & Overview
## 2. ✨ Features (only if 5+ specific features identified)
## 3. 🛠️ Tech Stack (ALWAYS include if package.json detected)
## 4. 🚀 Quick Start (Prerequisites, Installation, Environment Variables, Running)
## 5. 💻 Development (Available Scripts, Project Structure)
## 6. 📡 API Reference (only if clear API endpoints detected)
## 7. 🧪 Testing (only if test files detected)
## 8. 🚢 Deployment (only if deployment config detected)
## 9. 🤝 Contributing (only if CONTRIBUTING.md exists)
## 10. 📄 License (only if LICENSE file detected)
## 11. 👥 Authors & Acknowledgments (only if author info available)

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
   - Use emojis sparingly for visual hierarchy only

═══════════════════════════════════════════════════════════════════════════════
PROJECT DATA FOR ANALYSIS
═══════════════════════════════════════════════════════════════════════════════

### Repository: ${repoName}

${fileListSummary}

### Selected Files for Deep Analysis:
${selectedFilesContext}

═══════════════════════════════════════════════════════════════════════════════
FINAL INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

Generate a publication-ready README.md that:
✅ Renders perfectly on GitHub (test all Markdown syntax)
✅ Contains ONLY verified, project-specific information
✅ Uses proper table formatting with aligned columns
✅ Follows all formatting standards exactly as specified
✅ Has a professional, technical tone suitable for open-source
✅ Adapts structure based on project type and available data
✅ Omits any section without sufficient supporting evidence

Begin generating the README now. Output ONLY the Markdown content, starting with the # title.`;

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const result = await model.generateContent(prompt);
  const readme = result.response.text();

  if (progressCallback) await progressCallback(0.95);

  return readme;
}