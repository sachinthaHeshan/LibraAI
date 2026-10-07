"use client";

import { type FormEvent, useState } from "react";

import type { LoanBookOption } from "@/components/IssueLoanForm";

export const LOAN_DURATIONS = ["1 week", "2 weeks", "1 month"] as const;
export type LoanDuration = (typeof LOAN_DURATIONS)[number];

export type BorrowBookInput = {
  bookId: string;
  duration: LoanDuration;
};

type BorrowBookFormProps = {
  books: LoanBookOption[];
  onSubmit: (values: BorrowBookInput) => Promise<void>;
};

/** Self-service borrowing for members: the loan is always for the signed-in member. */
export function BorrowBookForm({ books, onSubmit }: BorrowBookFormProps) {
  const availableBooks = books.filter((book) => book.availableCopies > 0);
  const [bookId, setBookId] = useState("");
  const [duration, setDuration] = useState<LoanDuration>("2 weeks");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({ bookId, duration });
      setBookId("");
      setDuration("2 weeks");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unable to borrow book",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">Borrow a book</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          Pick an available title and how long you need it.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
        <label className="block text-sm font-semibold text-ink">
          Book
          <select
            className="field field-box field-select mt-1.5 disabled:bg-[#f1f4fb] disabled:text-muted"
            disabled={availableBooks.length === 0}
            onChange={(event) => setBookId(event.target.value)}
            required
            value={bookId}
          >
            <option value="">
              {availableBooks.length === 0 ? "No books available" : "Select a book"}
            </option>
            {availableBooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} ({book.availableCopies} available)
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="block text-sm font-semibold text-ink">Loan period</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-[#f3f4f6] p-1">
            {LOAN_DURATIONS.map((option) => {
              const selected = duration === option;
              return (
                <button
                  aria-pressed={selected}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    selected ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}
                  key={option}
                  onClick={() => setDuration(option)}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          className="btn-primary text-sm"
          disabled={availableBooks.length === 0 || !bookId || submitting}
          type="submit"
        >
          {submitting ? "Borrowing…" : "Borrow book"}
        </button>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-2xl bg-[#ffecea] px-3 py-2 text-sm font-medium text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
