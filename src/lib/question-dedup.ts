// Detects near-duplicate questions, not just exact text matches - two
// prompts that differ by a word or two, or a passage that's a lightly
// reworded copy of an existing one, should still be flagged. Deliberately
// dependency-free: normalized word-set (Jaccard) similarity is cheap
// enough to run against an entire category's pool on every import, and
// transparent enough that a false flag is easy for an admin to understand
// and override.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter(Boolean));
}

export function textSimilarity(a: string, b: string): number {
  const setA = wordSet(a);
  const setB = wordSet(b);
  if (setA.size === 0 || setB.size === 0) return setA.size === setB.size ? 1 : 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

export interface SimilarMatch {
  index: number;
  similarity: number;
}

// Combines a question's prompt and passage (when present) into one string
// before comparing - a reused passage with a differently-worded question
// on top of it should still be caught as substantially the same content.
export function questionSignature(q: { prompt: string; passage?: string | null }): string {
  return q.passage ? `${q.passage} ${q.prompt}` : q.prompt;
}

const DEFAULT_THRESHOLD = 0.72;

// Compares one candidate against a list of existing signatures, returning
// every match at or above the threshold - a candidate can be flagged
// against more than one existing question, useful for an admin reviewing
// why an import was rejected.
export function findSimilar(candidate: string, existing: string[], threshold = DEFAULT_THRESHOLD): SimilarMatch[] {
  const candidateNorm = candidate;
  const matches: SimilarMatch[] = [];
  existing.forEach((text, index) => {
    const similarity = textSimilarity(candidateNorm, text);
    if (similarity >= threshold) matches.push({ index, similarity });
  });
  return matches.sort((a, b) => b.similarity - a.similarity);
}
