import nlp from "compromise";
import { TfIdf } from "natural";

export default function extractContent(text: string): string {

    const sentences: string[] = nlp(text).sentences().out("array"); // Extract sentences
const sentenceCount = Math.ceil(sentences.length * 0.6); 
    if (sentences.length === 0) {
        return ""; // Return empty string if no sentences are found
    }
    console.log("sentence",sentences.length)
    

    const tfidf = new TfIdf();
    sentences.forEach((sentence: string) => tfidf.addDocument(sentence)); // Ensure sentence is a string
  
    const rankedSentences = sentences
        .map((sentence: string, index: number) => {
            let score = 0;
            tfidf.listTerms(index).forEach((term) => {
                score += term.tfidf;
            });

            return { sentence, score }; // Ensure sentence and score are included
        })
        .sort((a, b) => b.score - a.score) // Sort sentences by importance
        .slice(0, sentenceCount) // Pick top N sentences
        .map((item) => item.sentence) // Extract sentences
        .join(" "); // Join sentences with spaces

    return rankedSentences;
}