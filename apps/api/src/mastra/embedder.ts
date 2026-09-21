import { ModelRouterEmbeddingModel } from "@mastra/core/llm";
import { BOOK_EMBEDDING_DIMENSION, BOOK_EMBEDDING_MODEL } from "./constants.js";

export const bookEmbeddingProviderOptions = {
  google: { outputDimensionality: BOOK_EMBEDDING_DIMENSION },
};

let bookEmbeddingModel: ModelRouterEmbeddingModel | undefined;

export function getBookEmbeddingModel() {
  if (!bookEmbeddingModel) {
    bookEmbeddingModel = new ModelRouterEmbeddingModel(BOOK_EMBEDDING_MODEL);
  }
  return bookEmbeddingModel;
}
