import { FileWithEmbedding } from "./embedder";

export interface MMRConfig {
  topK: number;
  lambda: number; // Balance between relevance (high) and diversity (low)
}

export const DEFAULT_MMR_CONFIG: MMRConfig = {
  topK: 8,
  lambda: 0.65, // 65% relevance, 35% diversity
};

/**
 * Calculates cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimension");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
}

/**
 * Selects files using Maximal Marginal Relevance (MMR)
 * Balances relevance to query with diversity among selected files
 */
export function selectFilesWithMMR(
  files: FileWithEmbedding[],
  queryEmbedding: number[],
  config: MMRConfig = DEFAULT_MMR_CONFIG
): FileWithEmbedding[] {
  if (files.length === 0) return [];
  if (files.length <= config.topK) return files;

  const selected: FileWithEmbedding[] = [];
  const remaining = [...files];

  // Calculate relevance scores for all files
  const relevanceScores = remaining.map((file) =>
    cosineSimilarity(file.embedding, queryEmbedding)
  );

  // Select the most relevant file first
  let maxRelevanceIdx = 0;
  let maxRelevance = relevanceScores[0];
  for (let i = 1; i < relevanceScores.length; i++) {
    if (relevanceScores[i] > maxRelevance) {
      maxRelevance = relevanceScores[i];
      maxRelevanceIdx = i;
    }
  }

  selected.push(remaining[maxRelevanceIdx]);
  remaining.splice(maxRelevanceIdx, 1);
  relevanceScores.splice(maxRelevanceIdx, 1);

  // Iteratively select remaining files using MMR
  while (selected.length < config.topK && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const file = remaining[i];
      const relevance = relevanceScores[i];

      // Calculate maximum similarity to any already selected file
      let maxSimilarityToSelected = 0;
      for (const selectedFile of selected) {
        const similarity = cosineSimilarity(
          file.embedding,
          selectedFile.embedding
        );
        maxSimilarityToSelected = Math.max(maxSimilarityToSelected, similarity);
      }

      // MMR score: balance relevance and diversity
      const mmrScore =
        config.lambda * relevance -
        (1 - config.lambda) * maxSimilarityToSelected;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
    relevanceScores.splice(bestIdx, 1);
  }

  return selected;
}

/**
 * Default query for README generation
 */
export const README_GENERATION_QUERY =
  "Explain the purpose, architecture, features, dependencies, setup instructions, and technical implementation of this repository";