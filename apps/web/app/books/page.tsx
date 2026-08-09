"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { BookForm, type BookInput } from "@/components/BookForm";
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

  const loadBooks = useCallback(async (search = activeQuery) => {
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
  }, [activeQuery]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

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
    if (!window.confirm(`Delete “${book.title}”?`)) return;

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

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Books</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage titles and catalogue availability.
          </p>
        </div>
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          onClick={() => {
            setEditingBook(null);
            setFormOpen(true);
          }}
          type="button"
        >
          Add book
        </button>
      </div>

      <form className="mb-5 flex max-w-xl gap-2" onSubmit={handleSearch}>
        <input
          aria-label="Search books"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, author, or ISBN"
          value={query}
        />
        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          type="submit"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Title</th>
                <th className="px-5 py-3 font-semibold">Author</th>
                <th className="px-5 py-3 font-semibold">ISBN</th>
                <th className="px-5 py-3 font-semibold">Available / total</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {books.map((book) => (
                <tr className="text-slate-700" key={book.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {book.title}
                  </td>
                  <td className="px-5 py-4">{book.author}</td>
                  <td className="px-5 py-4 font-mono text-xs">{book.isbn}</td>
                  <td className="px-5 py-4">
                    {book.availableCopies} / {book.totalCopies}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="mr-3 font-medium text-indigo-600 hover:text-indigo-800"
                      onClick={() => {
                        setEditingBook(book);
                        setFormOpen(true);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="font-medium text-red-600 hover:text-red-800"
                      onClick={() => void deleteBook(book)}
                      type="button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">Loading…</p>
        ) : books.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No books found.
          </p>
        ) : null}
      </div>

      {formOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              {editingBook ? "Edit book" : "Add book"}
            </h2>
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
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
