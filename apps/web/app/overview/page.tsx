"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { OverviewAskBar } from "@/components/OverviewAskBar";
import { apiFetch } from "@/lib/api";
import { lendingActivitySeries } from "@/lib/lending-activity";

type Book = {
  id: string;
  title: string;
  author: string;
  totalCopies: number;
  availableCopies: number;
};

type Member = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

type Loan = {
  id: string;
  dueDate: string;
  overdue: boolean;
  issuedAt: string;
  book: { title: string };
  member: { name: string };
};

type ActivityLoan = {
  issuedAt: string;
};

function Ring({
  value,
  label,
  tone,
  compare,
}: {
  value: number;
  label: string;
  tone: string;
  compare: string;
}) {
  return (
    <div className="card flex flex-col items-center px-5 py-6 text-center">
      <p className="mb-4 w-full text-left text-sm font-semibold text-ink">{label}</p>
      <div className="ring" style={{ ["--value" as string]: value, ["--tone" as string]: tone }}>
        <span className="text-2xl font-bold text-ink">{value}%</span>
      </div>
      <p className="mt-4 text-xs font-medium text-muted">{compare}</p>
    </div>
  );
}

function ActivityChart({ points, labels }: { points: number[]; labels: string[] }) {
  const width = 640;
  const height = 220;
  const padX = 24;
  const padY = 20;
  const max = Math.max(...points, 1);

  const coords = points.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(points.length - 1, 1);
    const y = height - padY - (point / max) * (height - padY * 2);
    return { x, y, point };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg className="min-w-full" height={height + 28} viewBox={`0 0 ${width} ${height + 28}`} width="100%">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = height - padY - tick * (height - padY * 2);
          return (
            <g key={tick}>
              <line stroke="#eef0f4" strokeWidth="1" x1={padX} x2={width - padX} y1={y} y2={y} />
            </g>
          );
        })}
        <path d={line} fill="none" stroke="#2f6bff" strokeLinecap="round" strokeWidth="3" />
        <path
          d={`${line} L ${coords.at(-1)?.x ?? padX} ${height - padY} L ${padX} ${height - padY} Z`}
          fill="url(#loanFill)"
          opacity="0.18"
        />
        <defs>
          <linearGradient id="loanFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2f6bff" />
            <stop offset="100%" stopColor="#2f6bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {coords.map((c, index) => (
          <circle cx={c.x} cy={c.y} fill="#2f6bff" key={index} r="3.5" />
        ))}
        {labels.map((label, index) => (
          <text
            fill="#9ca3af"
            fontSize="11"
            key={`${label}-${index}`}
            textAnchor="middle"
            x={coords[index]?.x}
            y={height + 18}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export default function OverviewPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activityLoans, setActivityLoans] = useState<ActivityLoan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBooks, nextMembers, nextLoans, nextActivityLoans] = await Promise.all([
        apiFetch<Book[]>("/books"),
        apiFetch<Member[]>("/members"),
        apiFetch<Loan[]>("/loans?status=borrowed"),
        apiFetch<ActivityLoan[]>("/loans"),
      ]);
      setBooks(nextBooks);
      setMembers(nextMembers);
      setLoans(nextLoans);
      setActivityLoans(nextActivityLoans);
    } catch {
      setBooks([]);
      setMembers([]);
      setLoans([]);
      setActivityLoans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
  const onLoan = totalCopies - availableCopies;
  const activeMembers = members.filter((member) => member.status === "active").length;
  const overdue = loans.filter((loan) => loan.overdue).length;

  const availabilityPct =
    totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0;
  const activeMemberPct =
    members.length > 0 ? Math.round((activeMembers / members.length) * 100) : 0;
  const onTimePct =
    loans.length > 0 ? Math.round(((loans.length - overdue) / loans.length) * 100) : 100;

  const activity = useMemo(() => lendingActivitySeries(activityLoans), [activityLoans]);

  const lowStock = books
    .filter((book) => book.availableCopies === 0 || book.availableCopies / book.totalCopies <= 0.25)
    .slice(0, 5);

  return (
    <AppShell
      actions={
        <Link className="btn-primary text-sm" href="/loans">
          <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
            <path
              d="M7 4h8l4 4v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M15 4v4h4M9 12h6M9 16h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
          </svg>
          Manage loans
        </Link>
      }
      aside={
        <div className="space-y-5">
          <div className="card px-5 py-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#c7d2fe] text-2xl font-bold text-[#3730a3]">
              A
            </div>
            <h2 className="text-lg font-bold text-ink">Library Admin</h2>
            <p className="mt-1 text-sm text-muted">Administrator @ LibraAI</p>
          </div>

          <div className="card px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Quick stats</h3>
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-muted">Titles</dt>
                <dd className="mt-1 font-semibold text-ink">{books.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Members</dt>
                <dd className="mt-1 font-semibold text-ink">{members.length}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted">Active loans</dt>
                <dd className="mt-1 font-semibold text-ink">{loans.length}</dd>
              </div>
            </dl>
          </div>

          <div className="card px-5 py-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Shortcuts</h3>
            </div>
            <div className="space-y-2">
              <Link className="btn-ghost w-full text-sm" href="/books">
                Open catalogue
              </Link>
              <Link className="btn-ghost w-full text-sm" href="/members">
                View members
              </Link>
            </div>
          </div>
        </div>
      }
      subtitle="Last 12 months"
      title="Overview"
    >
      <div className="pb-28 lg:pb-24">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="card skeleton h-52" />
            <div className="card skeleton h-52" />
            <div className="card skeleton h-52" />
          </div>
        ) : (
          <>
            <div className="mb-5 grid gap-4 md:grid-cols-3">
            <Ring
              compare={`${availableCopies} of ${totalCopies || 0} copies free`}
              label="Availability"
              tone="#2f6bff"
              value={availabilityPct}
            />
            <Ring
              compare={`${activeMembers} active members`}
              label="Active members"
              tone="#22c55e"
              value={activeMemberPct}
            />
            <Ring
              compare={`${overdue} overdue right now`}
              label="On-time loans"
              tone="#f59e0b"
              value={onTimePct}
            />
          </div>

          <section className="card mb-5 px-5 py-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-ink">Lending activity</h2>
              <div className="flex items-center gap-4 text-xs font-medium text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <span className="dot dot-ok" style={{ background: "#2f6bff" }} />
                  Loans issued
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
                  {onLoan} currently out
                </span>
              </div>
            </div>
            <ActivityChart labels={activity.labels} points={activity.points} />
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="text-base font-bold text-ink">Catalogue attention</h2>
              <Link className="btn-link text-sm" href="/books">
                View all &gt;
              </Link>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Author</th>
                    <th>Copies</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowStock.length > 0 ? lowStock : books.slice(0, 5)).map((book) => {
                    const status =
                      book.availableCopies === 0
                        ? { label: "Out of stock", tone: "dot-danger" }
                        : book.availableCopies / book.totalCopies <= 0.25
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
                        <td>
                          {book.availableCopies}/{book.totalCopies}
                        </td>
                        <td>
                          <span className="badge">
                            <span className={`dot ${status.tone}`} />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {books.length === 0 ? (
                    <tr>
                      <td className="px-5 py-8 text-sm text-muted" colSpan={4}>
                        No books yet. Add titles in the catalogue.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
          </>
        )}
      </div>
      <OverviewAskBar />
    </AppShell>
  );
}
