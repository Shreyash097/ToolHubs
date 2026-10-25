// gemini_embeddings.js
/**
 * LangChain-compatible Embeddings adapter that calls the Gemini API directly.
 *
 * Why not LangChain's GoogleGenerativeAIEmbeddings? Google retired
 * text-embedding-004. Its replacement, gemini-embedding-001, returns 3072
 * numbers by default, but our Pinecone index stores 768. The Gemini API can
 * return 768 (outputDimensionality), and the LangChain wrapper in this
 * project's version has no option for that, so we call the SDK ourselves.
 *
 * Usage:
 *   import { GeminiEmbeddings } from './gemini_embeddings.js';
 *   const gemini = new GeminiEmbeddings({ taskType: 'RETRIEVAL_DOCUMENT', title: 'My docs' });
 *   const embs = await gemini.embedDocuments(["text1","text2"]);
 *
 * Requirements:
 *  - GOOGLE_API_KEY (or GEMINI_API_KEY) in .env
 */

import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { setTimeout as delay } from "timers/promises";
import "dotenv/config";

export class GeminiEmbeddings {
  /**
   * opts:
   *  - model: string (default "gemini-embedding-001")
   *  - taskType: TaskType enum or string (defaults to TaskType.RETRIEVAL_DOCUMENT)
   *  - title: optional document title (only used for RETRIEVAL_DOCUMENT)
   *  - batchSize: texts per API call
   *  - dimensions: vector size; must match the Pinecone index (default 768)
   */
  constructor(opts = {}) {
    const {
      model = process.env.GEMINI_MODEL || "gemini-embedding-001",
      taskType = process.env.GEMINI_TASK_TYPE || TaskType.RETRIEVAL_DOCUMENT,
      title = process.env.GEMINI_TITLE || undefined,
      batchSize = Number(process.env.GEMINI_BATCH_SIZE || 32),
      dimensions = Number(process.env.EMBEDDING_DIM || 768),
    } = opts;

    // If taskType is provided as a string (e.g., "RETRIEVAL_DOCUMENT"), convert to TaskType enum when possible
    this.taskType =
      typeof taskType === "string" ? TaskType[taskType] ?? taskType : taskType;
    this.title = title;
    this.batchSize = batchSize;
    this.dimensions = dimensions;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    this._model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model });
  }

  _request(text) {
    return {
      content: { role: "user", parts: [{ text }] },
      taskType: this.taskType,
      ...(this.title &&
        this.taskType === TaskType.RETRIEVAL_DOCUMENT && { title: this.title }),
      outputDimensionality: this.dimensions,
    };
  }

  // Retry rate-limit (429) and server (5xx) errors with exponential backoff
  async _withRetry(fn, attempts = 5) {
    for (let i = 1; ; i++) {
      try {
        return await fn();
      } catch (err) {
        const retryable = err.status === 429 || err.status >= 500;
        if (!retryable || i >= attempts) throw err;
        await delay(Math.min(30000, 1000 * 2 ** (i - 1)));
      }
    }
  }

  /**
   * Embed an array of documents (strings).
   * Returns Promise< number[][] >
   */
  async embedDocuments(texts) {
    if (!Array.isArray(texts))
      throw new Error("embedDocuments expects an array of strings");

    const out = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const res = await this._withRetry(() =>
        this._model.batchEmbedContents({
          requests: batch.map((t) => this._request(t)),
        })
      );
      out.push(...res.embeddings.map((e) => e.values));
    }
    return out;
  }

  /**
   * Embed a single query string (useful for retrieval queries).
   * Returns Promise<number[]>
   */
  async embedQuery(text) {
    const res = await this._withRetry(() =>
      this._model.embedContent(this._request(text))
    );
    return res.embedding.values;
  }
}
