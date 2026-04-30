/**
 * Generate an embedding vector for a text string.
 * Returns a float array (768 dimensions for text-embedding-004).
 */
export declare function embedText(text: string): Promise<number[]>;
/**
 * Cosine similarity between two vectors. Returns -1 to 1.
 */
export declare function cosineSimilarity(a: number[], b: number[]): number;
//# sourceMappingURL=embeddings.d.ts.map