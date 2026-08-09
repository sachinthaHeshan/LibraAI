"use client";

import { useCallback, useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import {
  IssueLoanForm,
  type IssueLoanInput,
  type LoanBookOption,
  type LoanMemberOption,
} from "@/components/IssueLoanForm";
import { apiFetch } from "@/lib/api";

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

  const loadLoansData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [nextBooks, nextMembers, nextLoans] = await Promise.all([
        apiFetch<LoanBookOption[]>("/books"),
        apiFetch<LoanMemberOption[]>("/members"),
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
    await loadLoansData();
  }

  async function returnLoan(loan: Loan) {
    setReturningId(loan.id);
    setError("");

    try {
      await apiFetch(`/loans/${loan.id}/return`, { method: "POST" });
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

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Loans</h1>
        <p className="mt-1 text-sm text-slate-600">
          Issue available books and manage current borrowing.
        </p>
      </div>

      <IssueLoanForm books={books} members={members} onSubmit={issueLoan} />

      <div className="mb-4 mt-8 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Borrowed books</h2>
          <p className="mt-1 text-sm text-slate-600">
            {loans.length} active {loans.length === 1 ? "loan" : "loans"}
          </p>
        </div>
      </div>

      {error ? (
        <p
          className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Book</th>
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Due date</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.map((loan) => (
                <tr className="text-slate-700" key={loan.id}>
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {loan.book.title}
                  </td>
                  <td className="px-5 py-4">{loan.member.name}</td>
                  <td className="px-5 py-4">{loan.dueDate}</td>
                  <td className="px-5 py-4">
                    {loan.overdue ? (
                      <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        Overdue
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Borrowed
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      className="font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-60"
                      disabled={returningId === loan.id}
                      onClick={() => void returnLoan(loan)}
                      type="button"
                    >
                      {returningId === loan.id ? "Returning…" : "Return"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Loading…
          </p>
        ) : loans.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No borrowed books.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
