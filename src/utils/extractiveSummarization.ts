import nlp from "compromise";

export default function extractContent(text: string): string {
    const sentences = nlp(text).sentences().out("array");
    const sentenceCount = Math.ceil(sentences.length * 0.6);

    const wordFreq: Record<string, number> = {};
    const totalWords: string[] = [];

    // Count word frequencies
    for (const sentence of sentences) {
        const words = nlp(sentence).terms().out("array");
        for (const word of words) {
            const lower = word.toLowerCase();
            wordFreq[lower] = (wordFreq[lower] || 0) + 1;
            totalWords.push(lower);
        }
    }

    // Score sentences based on sum of word frequencies
    const ranked = sentences
        .map((sentence: string) => {
            const words = nlp(sentence).terms().out("array");
            const score = words.reduce((sum: number, word: string) => sum + (wordFreq[word.toLowerCase()] || 0), 0);
            return { sentence, score };
        })
        .sort((a: { score: number; }, b: { score: number; }) => b.score - a.score)
        .slice(0, sentenceCount)
        .map((s: { sentence: unknown; }) => s.sentence)
        .join(" ");

    return ranked;
}
