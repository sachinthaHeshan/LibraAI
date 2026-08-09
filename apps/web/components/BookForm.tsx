"use client";

import { type FormEvent, useState } from "react";

export type BookInput = {
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  publishedYear?: number;
};

type BookFormProps = {
  initialValues?: BookInput;
  onCancel: () => void;
  onSubmit: (values: BookInput) => Promise<void>;
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export function BookForm({
  initialValues,
  onCancel,
  onSubmit,
}: BookFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [author, setAuthor] = useState(initialValues?.author ?? "");
  const [isbn, setIsbn] = useState(initialValues?.isbn ?? "");
  const [totalCopies, setTotalCopies] = useState(
    String(initialValues?.totalCopies ?? 1),
  );
  const [publishedYear, setPublishedYear] = useState(
    initialValues?.publishedYear ? String(initialValues.publishedYear) : "",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        totalCopies: Number(totalCopies),
        ...(publishedYear ? { publishedYear: Number(publishedYear) } : {}),
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to save book",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-slate-700">
        Title
        <input
          autoFocus
          className={fieldClass}
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Author
        <input
          className={fieldClass}
          onChange={(event) => setAuthor(event.target.value)}
          required
          value={author}
        />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        ISBN
        <input
          className={fieldClass}
          onChange={(event) => setIsbn(event.target.value)}
          required
          value={isbn}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Total copies
          <input
            className={fieldClass}
            min="1"
            onChange={(event) => setTotalCopies(event.target.value)}
            required
            type="number"
            value={totalCopies}
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Published year
          <input
            className={fieldClass}
            max="9999"
            min="1"
            onChange={(event) => setPublishedYear(event.target.value)}
            type="number"
            value={publishedYear}
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 pt-2">
        <button
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Saving…" : "Save book"}
        </button>
      </div>
    </form>
  );
}
