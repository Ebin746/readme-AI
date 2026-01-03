import { FileWithEmbedding } from "./embedder";

export interface ContextBuilderConfig {
  maxCharsPerFile: number;
  maxTotalChars: number;
}

export const DEFAULT_CONTEXT_CONFIG: ContextBuilderConfig = {
  maxCharsPerFile: 4000,
  maxTotalChars: 50000, // Safe limit for most LLMs
};

/**
 * Truncates content to a maximum character limit
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n... (truncated)";
}

/**
 * Prioritizes files based on their importance for README generation
 * Returns a priority score (higher is more important)
 */
function calculateFilePriority(path: string): number {
  const lowerPath = path.toLowerCase();
  
  // Critical files
  if (lowerPath === "package.json") return 100;
  if (lowerPath === "readme.md" || lowerPath === "readme") return 90;
  if (lowerPath === "tsconfig.json") return 85;
  if (lowerPath === ".eslintrc" || lowerPath.includes(".eslintrc")) return 80;
  
  // Configuration files
  if (lowerPath.includes("config")) return 70;
  
  // Main entry points
  if (lowerPath.includes("index.") || lowerPath.includes("main.")) return 65;
  if (lowerPath.includes("app.")) return 65;
  
  // Source code
  if (lowerPath.includes("src/")) return 50;
  if (lowerPath.includes("lib/")) return 50;
  
  // Documentation
  if (lowerPath.endsWith(".md")) return 45;
  
  // Tests (lower priority)
  if (lowerPath.includes("test") || lowerPath.includes("spec")) return 30;
  
  return 40; // Default priority
}

/**
 * Builds context string for LLM from selected files
 */
export function buildReadmeContext(
  files: FileWithEmbedding[],
  config: ContextBuilderConfig = DEFAULT_CONTEXT_CONFIG
): string {
  // Sort files by priority (higher priority first)
  const sortedFiles = [...files].sort((a, b) => {
    const priorityA = calculateFilePriority(a.path);
    const priorityB = calculateFilePriority(b.path);
    return priorityB - priorityA;
  });

  let context = "";
  let totalChars = 0;

  for (const file of sortedFiles) {
    // Calculate remaining space
    const remainingSpace = config.maxTotalChars - totalChars;
    if (remainingSpace <= 0) break;

    // Determine how much of this file we can include
    const maxCharsForThisFile = Math.min(
      config.maxCharsPerFile,
      remainingSpace
    );

    const truncatedContent = truncateContent(file.content, maxCharsForThisFile);
    
    // Build file section
    const fileSection = `FILE: ${file.path}\n${"=".repeat(50)}\n${truncatedContent}\n\n`;
    
    context += fileSection;
    totalChars += fileSection.length;
  }

  return context.trim();
}

/**
 * Creates a file list summary (paths only)
 */
export function buildFileListSummary(allFiles: string[]): string {
  let summary = "## Complete File List\n\n";
  
  // Group files by directory
  const filesByDir = new Map<string, string[]>();
  
  for (const file of allFiles) {
    const parts = file.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "root";
    
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    filesByDir.get(dir)!.push(file);
  }

  // Sort directories
  const sortedDirs = Array.from(filesByDir.keys()).sort();
  
  for (const dir of sortedDirs) {
    const files = filesByDir.get(dir)!;
    if (dir !== "root") {
      summary += `\n### ${dir}/\n`;
    }
    files.forEach(file => {
      summary += `- ${file}\n`;
    });
  }

  return summary;
}