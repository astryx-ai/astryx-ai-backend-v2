import OpenAI from "openai";
import { ENV } from "../../config/env";

class EmbeddingService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: ENV.AZURE_OPENAI_API_KEY,
      baseURL: `${ENV.AZURE_OPENAI_ENDPOINT}/openai/deployments/${ENV.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}`,
      defaultQuery: { "api-version": "2024-02-01" },
      defaultHeaders: {
        "api-key": ENV.AZURE_OPENAI_API_KEY,
      },
    });
  }

  /**
   * Generate embeddings for text using Azure OpenAI
   * @param text - The text to generate embeddings for
   * @returns Promise<number[]> - The embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Clean and prepare the text
      const cleanText = text.trim().replace(/\s+/g, " ");

      if (!cleanText) {
        throw new Error("Empty text provided for embedding generation");
      }

      const response = await this.client.embeddings.create({
        model: ENV.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        input: cleanText,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding data returned from Azure OpenAI");
      }

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error(
        `Failed to generate embedding: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise<number[][]> - Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (texts.length === 0) {
        return [];
      }

      // Clean texts
      const cleanTexts = texts
        .map((text) => text.trim().replace(/\s+/g, " "))
        .filter((text) => text.length > 0);

      if (cleanTexts.length === 0) {
        throw new Error("No valid texts provided for embedding generation");
      }

      const response = await this.client.embeddings.create({
        model: ENV.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
        input: cleanTexts,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding data returned from Azure OpenAI");
      }

      return response.data.map((item: any) => item.embedding);
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw new Error(
        `Failed to generate embeddings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns number - Cosine similarity score (-1 to 1)
   */
  calculateCosineSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same dimension");
    }

    const dotProduct = embedding1.reduce(
      (sum, a, i) => sum + a * embedding2[i],
      0
    );
    const magnitude1 = Math.sqrt(embedding1.reduce((sum, a) => sum + a * a, 0));
    const magnitude2 = Math.sqrt(embedding2.reduce((sum, a) => sum + a * a, 0));

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }
}

// Export singleton instance
export const embeddingService = new EmbeddingService();
export default embeddingService;
