export default function extractContent(text: string): string {
    // Parse content if it's a JSON string of code files
    let content = text;
    try {
      const parsed = JSON.parse(text);
      // If it's a code file collection, concatenate all content
      if (typeof parsed === 'object') {
        content = Object.values(parsed).join('\n\n');
      }
    } catch {
      // Continue with original text if not JSON
    }
  
    // Split into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length <= 3) return content;
  
    // Create document corpus
    const corpus = sentences.map(s => {
      const terms = s.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 1);
      return terms;
    });
  
    // Calculate IDF for each term
    const docFrequency: Record<string, number> = {};
    const N = corpus.length;
  
    corpus.forEach(doc => {
      const uniqueTerms = new Set(doc);
      uniqueTerms.forEach(term => {
        docFrequency[term] = (docFrequency[term] || 0) + 1;
      });
    });
  
    // Calculate BM25 scores for each sentence
    const k1 = 1.2;  // Term frequency saturation parameter
    const b = 0.75;  // Length normalization parameter
    const avgDocLength = corpus.reduce((sum, doc) => sum + doc.length, 0) / N;
    
    const sentenceScores = sentences.map((sentence, i) => {
      const terms = corpus[i];
      const docLength = terms.length;
      
      // Calculate BM25 score for the sentence
      let score = 0;
      const uniqueTerms = new Set(terms);
      
      uniqueTerms.forEach(term => {
        // Term frequency in this document
        const tf = terms.filter(t => t === term).length;
        
        // IDF component
        const idf = Math.log((N - docFrequency[term] + 0.5) / (docFrequency[term] + 0.5) + 1);
        
        // BM25 for this term
        const termScore = idf * ((tf * (k1 + 1)) / 
                               (tf + k1 * (1 - b + b * (docLength / avgDocLength))));
        
        score += termScore;
      });
      
      return { index: i, text: sentence, score };
    });
  
    // Sort by score and select top sentences (60% of original)
    const sentenceCount = Math.ceil(sentences.length * 0.6);
    sentenceScores.sort((a, b) => b.score - a.score);
    const selectedSentences = sentenceScores.slice(0, sentenceCount);
    
    // Re-order by original position to maintain coherence
    selectedSentences.sort((a, b) => a.index - b.index);
    
    return selectedSentences.map(s => s.text).join(" ");
  }