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

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-500";

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
    <form
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <label className="block text-sm font-medium text-slate-700">
          Book
          <select
            className={fieldClass}
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

        <label className="block text-sm font-medium text-slate-700">
          Member
          <select
            className={fieldClass}
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

        <label className="block text-sm font-medium text-slate-700">
          Due date
          <input
            className={fieldClass}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setDueDate(event.target.value)}
            required
            type="date"
            value={dueDate}
          />
        </label>

        <button
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canIssue || submitting}
          type="submit"
        >
          {submitting ? "Issuing…" : "Issue loan"}
        </button>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
