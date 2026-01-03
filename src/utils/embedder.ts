import { GoogleGenerativeAI } from "@google/generative-ai";

export interface FileWithContent {
  path: string;
  content: string;
}

export interface FileWithEmbedding extends FileWithContent {
  embedding: number[];
}

const MAX_CHARS_PER_FILE = 4000;

/**
 * Truncates content to a maximum character limit
 */
function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + "\n... (truncated)";
}

/**
 * Generates embeddings for an array of files using Gemini
 */
export async function generateEmbeddings(
  files: FileWithContent[],
  signal?: AbortSignal
): Promise<FileWithEmbedding[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const filesWithEmbeddings: FileWithEmbedding[] = [];

  // Process files in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < files.length; i += batchSize) {
    if (signal?.aborted) throw new Error("Embedding generation cancelled");

    const batch = files.slice(i, i + batchSize);
    
    const embeddingPromises = batch.map(async (file) => {
      try {
        // Truncate content to reasonable size
        const truncatedContent = truncateContent(file.content, MAX_CHARS_PER_FILE);
        
        // Create embedding input with file path context
        const embeddingText = `File: ${file.path}\n\n${truncatedContent}`;
        
        const result = await model.embedContent(embeddingText);
        const embedding = result.embedding.values;

        return {
          path: file.path,
          content: file.content,
          embedding: Array.from(embedding),
        };
      } catch (error) {
        console.error(`Error generating embedding for ${file.path}:`, error);
        // Return file with zero embedding as fallback
        return {
          path: file.path,
          content: file.content,
          embedding: new Array(768).fill(0), // Default embedding dimension
        };
      }
    });

    const batchResults = await Promise.all(embeddingPromises);
    filesWithEmbeddings.push(...batchResults);
  }
  return filesWithEmbeddings;
}

/**
 * Generates a single embedding for a query string
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(query);
  return Array.from(result.embedding.values);
}