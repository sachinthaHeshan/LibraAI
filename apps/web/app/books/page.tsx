"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/Alert";
import { AppShell } from "@/components/AppShell";
import { BookForm, type BookInput } from "@/components/BookForm";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/TableSkeleton";
import { apiFetch } from "@/lib/api";

type Book = BookInput & {
  id: string;
  availableCopies: number;
  publishedYear?: number | null;
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBooks = useCallback(
    async (search = activeQuery) => {
      setLoading(true);
      setError("");
      try {
        const suffix = search ? `?q=${encodeURIComponent(search)}` : "";
        setBooks(await apiFetch<Book[]>(`/books${suffix}`));
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load books",
        );
      } finally {
        setLoading(false);
      }
    },
    [activeQuery],
  );

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setActiveQuery(query.trim());
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActiveQuery(query.trim());
  }

  async function saveBook(values: BookInput) {
    await apiFetch(editingBook ? `/books/${editingBook.id}` : "/books", {
      method: editingBook ? "PATCH" : "POST",
      body: JSON.stringify(values),
    });
    setFormOpen(false);
    setEditingBook(null);
    await loadBooks();
  }

  async function deleteBook(book: Book) {
    if (!window.confirm(`Delete “${book.title}”? This cannot be undone.`)) return;

    setError("");
    try {
      await apiFetch(`/books/${book.id}`, { method: "DELETE" });
      await loadBooks();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete book",
      );
    }
  }

  const available = books.reduce((sum, book) => sum + book.availableCopies, 0);
  const total = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const out = total - available;

  return (
    <AppShell
      actions={
        <button
          className="btn-primary text-sm"
          onClick={() => {
            setEditingBook(null);
            setFormOpen(true);
          }}
          type="button"
        >
          <span aria-hidden>+</span>
          Add book
        </button>
      }
      title="Books"
    >
      <form className="mb-5 max-w-md" onSubmit={handleSearch}>
        <div className="field field-with-icon">
          <span aria-hidden className="shrink-0 text-muted">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="m16 16 3.5 3.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.6"
              />
            </svg>
          </span>
          <input
            aria-label="Search books"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, author, or ISBN"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white"
              onClick={() => setQuery("")}
              type="button"
            >
              ×
            </button>
          ) : null}
        </div>
      </form>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard hint="In catalogue" label="Titles" value={books.length} />
        <StatCard hint="Ready to borrow" label="Available copies" value={available} />
        <StatCard hint="Currently out" label="On loan" value={out} />
      </div>

      {error ? <Alert message={error} onDismiss={() => setError("")} /> : null}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink">Catalogue</h2>
            <p className="mt-1 text-sm text-muted">
              {activeQuery
                ? `Results for “${activeQuery}”`
                : `${books.length} ${books.length === 1 ? "title" : "titles"}`}
            </p>
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} rows={6} />
        ) : books.length === 0 ? (
          <EmptyState
            actionLabel={activeQuery ? undefined : "Add book"}
            description={
              activeQuery
                ? "Try another title, author, or ISBN."
                : "Add your first title to start lending."
            }
            onAction={
              activeQuery
                ? undefined
                : () => {
                    setEditingBook(null);
                    setFormOpen(true);
                  }
            }
            title={activeQuery ? "No matches" : "No books yet"}
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>ISBN</th>
                  <th>Availability</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => {
                  const ratio =
                    book.totalCopies > 0
                      ? (book.availableCopies / book.totalCopies) * 100
                      : 0;

                  const status =
                    book.availableCopies === 0
                      ? { label: "Out of stock", tone: "dot-danger" }
                      : ratio <= 25
                        ? { label: "Low quantity", tone: "dot-warn" }
                        : { label: "In stock", tone: "dot-ok" };

                  return (
                    <tr key={book.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#60a5fa] to-[#2563eb]" />
                          <span className="font-semibold text-ink">{book.title}</span>
                        </div>
                      </td>
                      <td>{book.author}</td>
                      <td className="font-mono text-xs text-muted">{book.isbn}</td>
                      <td>
                        <div className="mb-1.5 text-sm font-medium text-ink">
                          {book.availableCopies} / {book.totalCopies}
                        </div>
                        <div className="meter" title={`${Math.round(ratio)}% available`}>
                          <span style={{ width: `${ratio}%` }} />
                        </div>
                        <div className="badge mt-2">
                          <span className={`dot ${status.tone}`} />
                          {status.label}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            aria-label={`Edit ${book.title}`}
                            className="btn-icon"
                            onClick={() => {
                              setEditingBook(book);
                              setFormOpen(true);
                            }}
                            type="button"
                          >
                            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <path
                                d="m5 16.5 9.8-9.8a1.5 1.5 0 0 1 2.1 0l1.4 1.4a1.5 1.5 0 0 1 0 2.1L8.5 20H5v-3.5Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </button>
                          <button
                            aria-label={`Delete ${book.title}`}
                            className="btn-icon btn-icon-danger"
                            onClick={() => void deleteBook(book)}
                            type="button"
                          >
                            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <path
                                d="M5 7h14M10 11v5M14 11v5M9 7l.6-1.5A1 1 0 0 1 10.5 5h3a1 1 0 0 1 .9.5L15 7m-8 0 1 11a2 2 0 0 0 2 1.8h4a2 2 0 0 0 2-1.8l1-11"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeWidth="1.6"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {formOpen ? (
        <Modal
          onClose={() => {
            setFormOpen(false);
            setEditingBook(null);
          }}
          title={editingBook ? "Edit book" : "Add book"}
        >
          <BookForm
            initialValues={
              editingBook
                ? {
                    ...editingBook,
                    publishedYear: editingBook.publishedYear ?? undefined,
                  }
                : undefined
            }
            onCancel={() => {
              setFormOpen(false);
              setEditingBook(null);
            }}
            onSubmit={saveBook}
          />
        </Modal>
      ) : null}
    </AppShell>
  );
}
