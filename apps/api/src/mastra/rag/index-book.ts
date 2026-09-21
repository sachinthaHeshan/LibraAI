import type { BookEmbeddingSource } from "./book-document.js";
import { buildBookEmbeddingMetadata } from "./book-document.js";
import {
  BOOK_EMBEDDING_DIMENSION,
  BOOK_EMBEDDINGS_INDEX,
} from "../constants.js";
import { bookEmbeddingProviderOptions, getBookEmbeddingModel } from "../embedder.js";
import { isBookIndexingEnabled } from "../google.js";
import { getPgVector } from "../vector.js";

let indexReady = false;

async function ensureBookIndex(dimension: number) {
  const pgVector = getPgVector();
  await pgVector.createIndex({
    indexName: BOOK_EMBEDDINGS_INDEX,
    dimension,
    metric: "cosine",
    indexConfig: { type: "hnsw" },
    metadataIndexes: ["organizationId"],
  });
  indexReady = true;
}

async function embedBookText(text: string): Promise<number[]> {
  const result = await getBookEmbeddingModel().doEmbed({
    values: [text],
    providerOptions: bookEmbeddingProviderOptions,
  });
  const embedding = result.embeddings[0];
  if (!embedding) {
    throw new Error("Embedding model returned no vector");
  }
  return embedding;
}

export async function indexBook(book: BookEmbeddingSource): Promise<void> {
  const metadata = buildBookEmbeddingMetadata(book);
  const embedding = await embedBookText(metadata.text);
  if (!indexReady) {
    await ensureBookIndex(embedding.length || BOOK_EMBEDDING_DIMENSION);
  }
  await getPgVector().upsert({
    indexName: BOOK_EMBEDDINGS_INDEX,
    vectors: [embedding],
    metadata: [metadata],
    ids: [book.id],
  });
}

export async function indexBookBestEffort(
  book: BookEmbeddingSource,
): Promise<void> {
  if (!isBookIndexingEnabled()) {
    return;
  }
  try {
    await indexBook(book);
  } catch (error) {
    console.error(`Failed to index book ${book.id}`, error);
  }
}

export async function deleteBookEmbedding(bookId: string): Promise<void> {
  if (!isBookIndexingEnabled()) {
    return;
  }
  try {
    await getPgVector().deleteVector({
      indexName: BOOK_EMBEDDINGS_INDEX,
      id: bookId,
    });
  } catch (error) {
    console.error(`Failed to delete book embedding ${bookId}`, error);
  }
}

export async function reindexBooks(
  booksToIndex: BookEmbeddingSource[],
): Promise<{ indexed: number; failed: number }> {
  let indexed = 0;
  let failed = 0;
  for (const book of booksToIndex) {
    try {
      await indexBook(book);
      indexed += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed to index book ${book.id}`, error);
    }
  }
  return { indexed, failed };
}
