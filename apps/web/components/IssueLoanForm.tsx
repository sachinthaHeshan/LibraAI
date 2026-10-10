"use client";

import { type FormEvent, useState } from "react";

export type LoanBookOption = {
  id: string;
  title: string;
  availableCopies: number;
};

export type LoanMemberOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export type IssueLoanInput = {
  bookId: string;
  memberId: string;
  dueDate: string;
};

type IssueLoanFormProps = {
  books: LoanBookOption[];
  members: LoanMemberOption[];
  onSubmit: (values: IssueLoanInput) => Promise<void>;
};

function defaultDueDate() {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);
  return dueDate.toISOString().slice(0, 10);
}

export function IssueLoanForm({
  books,
  members,
  onSubmit,
}: IssueLoanFormProps) {
  const availableBooks = books.filter((book) => book.availableCopies > 0);
  const activeMembers = members.filter((member) => member.status === "active");
  const [bookId, setBookId] = useState("");
  const [memberId, setMemberId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canIssue = availableBooks.length > 0 && activeMembers.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await onSubmit({ bookId, memberId, dueDate });
      setBookId("");
      setMemberId("");
      setDueDate(defaultDueDate());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to issue loan",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-5 sm:p-6" onSubmit={handleSubmit}>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink">Issue a book</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          Pick an available title, an active member, and a due date.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
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
              {availableBooks.length === 0
                ? "No books available"
                : "Select a book"}
            </option>
            {availableBooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title} ({book.availableCopies} available)
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-ink">
          Member
          <select
            className="field field-box field-select mt-1.5 disabled:bg-[#f1f4fb] disabled:text-muted"
            disabled={activeMembers.length === 0}
            onChange={(event) => setMemberId(event.target.value)}
            required
            value={memberId}
          >
            <option value="">
              {activeMembers.length === 0
                ? "No active members"
                : "Select a member"}
            </option>
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-ink">
          Due date
          <input
            className="field field-box mt-1.5"
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDueDate(event.target.value)}
            required
            type="date"
            value={dueDate}
          />
        </label>

        <button
          className="btn-primary text-sm"
          disabled={!canIssue || submitting}
          type="submit"
        >
          {submitting ? "Issuing…" : "Issue loan"}
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
