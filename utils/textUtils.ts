// Text utility functions

/**
 * Split text into sentences based on punctuation
 * Vietnamese sentence endings: . ! ? ... 
 */
export function splitIntoSentences(text: string): string[] {
  // Replace multiple spaces/newlines with single space
  const normalized = text.replace(/\s+/g, ' ').trim();
  
  // Split by sentence-ending punctuation
  // Keep the punctuation with the sentence
  const sentences = normalized.split(/(?<=[.!?…])\s+/);
  
  // Filter out empty sentences and very short ones
  return sentences
    .map(s => s.trim())
    .filter(s => s.length > 3); // Skip very short fragments
}

/**
 * Group sentences into chunks for better TTS performance
 * Each chunk should be 1-3 sentences or ~100-300 characters
 */
export function groupSentencesIntoChunks(
  sentences: string[], 
  minChunkSize: number = 50,
  maxChunkSize: number = 300
): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If adding this sentence would exceed max, save current and start new
    if (currentChunk && (currentChunk.length + sentence.length) > maxChunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      
      // If chunk is large enough, save it
      if (currentChunk.length >= minChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
  }
  
  // Add remaining text
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Restore censored words that were masked with asterisks
 * This function replaces censored words back to their original form
 */
export function restoreCensoredWords(text: string): string {
  // Dictionary mapping censored patterns to original words
  const censoredWordMap: { [key: string]: string } = {
    'k*ch th*ch': 'kích thích',
    'b*n r*': 'bắn ra',
    'l*n đ*nh': 'lên đỉnh',
    'g**t': 'giết',
    'ch*t': 'chết',
    'kh*ng b*': 'khủng bố',
    't** ch**n': 'tinh chiến',
    's* s**ng': 'sờ soạng',
    'l* m*ng': 'lỗ mãng',
    'k** r*n': 'khẽ rên',
    'b* ng*c': 'bộ ngực',
    'h**p': 'hiếp',
    'r*n r*': 'rên rỉ'
  };
  
  let restoredText = text;
  
  // Replace each censored pattern with its original form
  for (const [censored, original] of Object.entries(censoredWordMap)) {
    restoredText = restoredText.replaceAll(censored, original);
  }
  
  return restoredText;
}

