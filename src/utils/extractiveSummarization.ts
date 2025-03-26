import nlp from "compromise";
import { TfIdf } from "natural";

export function extractContent(text: string, sentenceCount: number = 5): string {
    if (sentenceCount <= 0) {
        throw new Error("sentenceCount must be greater than 0");
    }

    const sentences = nlp(text).sentences().out("array"); // Extract sentences

    if (sentences.length === 0) {
        return ""; // Return empty string if no sentences are found
    }

    if (sentences.length <= sentenceCount) {
        return sentences.join(" "); // Return full text if too short
    }

    const tfidf = new TfIdf();
    sentences.forEach((sentence: string | string[] | Record<string, string>) => tfidf.addDocument(sentence)); // Add sentences to TF-IDF model

    const rankedSentences = sentences
        .map((sentence: string, index: number) => {
            let score = 0;
            tfidf.listTerms(index).forEach((term) => {
                score += term.tfidf;
            });

            return { sentence, score };
        })
        .sort((a: { score: number; }, b: { score: number; }) => b.score - a.score) // Sort sentences by importance
        .slice(0, sentenceCount) // Pick top N sentences
        .map((item: { sentence: string; }) => item.sentence)
        .join(" "); // Join sentences with space

    return rankedSentences;
}

// Example usage:
