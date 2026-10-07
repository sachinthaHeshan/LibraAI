"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert } from "@/components/Alert";
import { AppShell } from "@/components/AppShell";
import { BorrowBookForm, type BorrowBookInput } from "@/components/BorrowBookForm";
import { EmptyState } from "@/components/EmptyState";
import {
  IssueLoanForm,
  type IssueLoanInput,
  type LoanBookOption,
  type LoanMemberOption,
} from "@/components/IssueLoanForm";
import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/TableSkeleton";
import { apiFetch } from "@/lib/api";
import { getTokenRole } from "@/lib/auth";
import { useAccountRole } from "@/lib/use-account-role";

type Loan = {
  id: string;
  dueDate: string;
  status: "borrowed" | "returned";
  overdue: boolean;
  book: {
    id: string;
    title: string;
  };
  member: {
    id: string;
    name: string;
  };
};

export default function LoansPage() {
  const [books, setBooks] = useState<LoanBookOption[]>([]);
  const [members, setMembers] = useState<LoanMemberOption[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [returningId, setReturningId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // Members get a read-only list of their own loans (the API scopes /loans).
  const isMember = useAccountRole() === "member";

  const loadLoansData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const member = getTokenRole() === "member";
      const [nextBooks, nextMembers, nextLoans] = await Promise.all([
        apiFetch<LoanBookOption[]>("/books"),
        member ? Promise.resolve([]) : apiFetch<LoanMemberOption[]>("/members"),
        apiFetch<Loan[]>("/loans?status=borrowed"),
      ]);
      setBooks(nextBooks);
      setMembers(nextMembers);
      setLoans(nextLoans);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load loans",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLoansData();
  }, [loadLoansData]);

  async function issueLoan(values: IssueLoanInput) {
    await apiFetch("/loans", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setNotice("Book issued successfully.");
    await loadLoansData();
  }

  async function borrowBook(values: BorrowBookInput) {
    const book = books.find((option) => option.id === values.bookId);
    await apiFetch("/loans/borrow", {
      method: "POST",
      body: JSON.stringify(values),
    });
    setNotice(`Borrowed “${book?.title ?? "book"}” for ${values.duration}.`);
    await loadLoansData();
  }

  async function returnLoan(loan: Loan) {
    setReturningId(loan.id);
    setError("");
    setNotice("");

    try {
      await apiFetch(`/loans/${loan.id}/return`, { method: "POST" });
      setNotice(`Returned “${loan.book.title}”.`);
      await loadLoansData();
    } catch (returnError) {
      setError(
        returnError instanceof Error
          ? returnError.message
          : "Unable to return loan",
      );
    } finally {
      setReturningId("");
    }
  }

  const overdueCount = loans.filter((loan) => loan.overdue).length;

  return (
    <AppShell
      title={isMember ? "My loans" : "Loans"}
    >
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard
          hint={isMember ? "Books you have out" : "Out with members"}
          label="Active loans"
          value={loans.length}
        />
        <StatCard hint="Past due date" label="Overdue" value={overdueCount} />
      </div>

      {isMember ? (
        <BorrowBookForm books={books} onSubmit={borrowBook} />
      ) : (
        <IssueLoanForm books={books} members={members} onSubmit={issueLoan} />
      )}

      <div className="mt-5">
        {error ? <Alert message={error} onDismiss={() => setError("")} /> : null}
        {notice ? (
          <div
            className="mb-4 rounded-xl border border-[#bbf7d0] bg-success-soft px-4 py-3 text-sm font-medium text-[#15803d]"
            role="status"
          >
            {notice}
          </div>
        ) : null}
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-ink">
              {isMember ? "My borrowed books" : "Borrowed books"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {loans.length} active {loans.length === 1 ? "loan" : "loans"}
            </p>
          </div>
        </div>

        {loading ? (
          <TableSkeleton cols={4} rows={5} />
        ) : loans.length === 0 ? (
          <EmptyState
            description={
              isMember
                ? "Borrow a book above or ask LibraAI in chat. It will show up here with its due date."
                : "Issue a book above to see it listed here with its due date."
            }
            title="Nothing borrowed right now"
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book</th>
                  {isMember ? null : <th>Member</th>}
                  <th>Due date</th>
                  <th>Status</th>
                  {isMember ? null : <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id}>
                    <td className="font-semibold text-ink">{loan.book.title}</td>
                    {isMember ? null : (
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#c7d2fe] text-xs font-bold text-[#3730a3]">
                            {loan.member.name.slice(0, 1).toUpperCase()}
                          </span>
                          {loan.member.name}
                        </div>
                      </td>
                    )}
                    <td>{loan.dueDate}</td>
                    <td>
                      {loan.overdue ? (
                        <span className="badge">
                          <span className="dot dot-danger" />
                          Overdue
                        </span>
                      ) : (
                        <span className="badge">
                          <span className="dot dot-ok" />
                          Borrowed
                        </span>
                      )}
                    </td>
                    {isMember ? null : (
                      <td className="text-right">
                        <button
                          className="btn-primary text-sm"
                          disabled={returningId === loan.id}
                          onClick={() => void returnLoan(loan)}
                          type="button"
                        >
                          {returningId === loan.id ? "Returning…" : "Return"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
