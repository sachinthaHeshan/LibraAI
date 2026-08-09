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
      <label className="block text-sm font-semibold text-ink">
        Title
        <input
          autoFocus
          className="field field-box mt-1.5"
          onChange={(event) => setTitle(event.target.value)}
          required
          value={title}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        Author
        <input
          className="field field-box mt-1.5"
          onChange={(event) => setAuthor(event.target.value)}
          required
          value={author}
        />
      </label>
      <label className="block text-sm font-semibold text-ink">
        ISBN
        <input
          className="field field-box mt-1.5"
          onChange={(event) => setIsbn(event.target.value)}
          required
          value={isbn}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-ink">
          Total copies
          <input
            className="field field-box mt-1.5"
            min="1"
            onChange={(event) => setTotalCopies(event.target.value)}
            required
            type="number"
            value={totalCopies}
          />
        </label>
        <label className="block text-sm font-semibold text-ink">
          Published year
          <input
            className="field field-box mt-1.5"
            max="9999"
            min="1"
            onChange={(event) => setPublishedYear(event.target.value)}
            type="number"
            value={publishedYear}
          />
        </label>
      </div>
      {error ? (
        <p className="rounded-2xl bg-[#ffecea] px-3 py-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-3 pt-2">
        <button className="btn-ghost text-sm" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="btn-primary text-sm" disabled={submitting} type="submit">
          {submitting ? "Saving…" : "Save book"}
        </button>
      </div>
    </form>
  );
}
