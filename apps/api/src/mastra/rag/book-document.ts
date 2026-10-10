export type BookDocumentInput = {
  title: string;
  author: string;
  isbn: string;
  publishedYear?: number | null;
  genre?: string | null;
  description?: string | null;
};

export type BookEmbeddingSource = BookDocumentInput & {
  id: string;
  organizationId: string;
};

export type BookEmbeddingMetadata = {
  text: string;
  bookId: string;
  organizationId: string;
  title: string;
  author: string;
  isbn: string;
  genre: string | null;
  publishedYear: number | null;
};

export function buildBookDocumentText(book: BookDocumentInput): string {
  const lines = [
    `Title: ${book.title}`,
    `Author: ${book.author}`,
    `ISBN: ${book.isbn}`,
  ];

  if (book.publishedYear) {
    lines.push(`Year: ${book.publishedYear}`);
  }
  if (book.genre?.trim()) {
    lines.push(`Genre: ${book.genre.trim()}`);
  }
  if (book.description?.trim()) {
    lines.push(`Description: ${book.description.trim()}`);
  }

  return lines.join("\n");
}

export function buildBookEmbeddingMetadata(
  book: BookEmbeddingSource,
): BookEmbeddingMetadata {
  return {
    text: buildBookDocumentText(book),
    bookId: book.id,
    organizationId: book.organizationId,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre?.trim() || null,
    publishedYear: book.publishedYear ?? null,
  };
}
