"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  type MemberRecommendations,
  fetchRecommendations,
  nextPicksLabel,
} from "@/lib/recommendations";

/** Overview section for members: the recommendation agent's current picks. */
export function RecommendedForYou() {
  const [data, setData] = useState<MemberRecommendations | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRecommendations()
      .then((next) => {
        if (active) setData(next);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-labelledby="recommended-heading" className="card mb-5 px-5 py-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink" id="recommended-heading">
            Recommended for you
          </h2>
          {data?.summary ? (
            <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted">{data.summary}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted">
            AI-picked from your reading preferences and loan history (popular titles if you have neither).{" "}
            <Link className="btn-link" href="/settings">
              How this works
            </Link>
          </p>
        </div>
        {data && data.books.length > 0 ? (
          <span className="badge shrink-0">{nextPicksLabel(data.nextRefreshAt)}</span>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-muted">Recommendations are unavailable right now.</p>
      ) : !data ? (
        <div aria-busy="true">
          <p className="mb-3 text-sm text-muted">Finding books for you…</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="skeleton h-40 rounded-xl" key={index} />
            ))}
          </div>
        </div>
      ) : data.books.length === 0 ? (
        <p className="text-sm text-muted">
          No recommendations yet. Set your{" "}
          <Link className="btn-link" href="/settings">
            reading preferences
          </Link>{" "}
          to get personal picks.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.books.map((book) => {
            const available = book.availableCopies > 0;
            return (
              <li key={book.id}>
                <article className="flex h-full flex-col rounded-xl border border-line bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-start gap-3">
                    <Image
                      alt=""
                      aria-hidden
                      className="h-10 w-10 shrink-0 object-contain"
                      height={40}
                      src="/book.png"
                      unoptimized
                      width={43}
                    />
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold text-ink">{book.title}</h3>
                      <p className="truncate text-xs text-muted">{book.author}</p>
                    </div>
                  </div>
                  {book.reasons[0] ? (
                    <p className="mb-3 line-clamp-2 text-xs text-ink">{book.reasons[0]}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="badge">
                      <span className={`dot ${available ? "dot-ok" : "dot-danger"}`} />
                      {available ? `${book.availableCopies} available` : "Out of stock"}
                    </span>
                    {available ? (
                      <Link className="btn-link text-xs" href="/loans">
                        Borrow
                      </Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
