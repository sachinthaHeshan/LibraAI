import Image from "next/image";

import type { ChatBook } from "@/lib/chat";

function availability(book: ChatBook) {
  const ratio =
    book.totalCopies > 0 ? (book.availableCopies / book.totalCopies) * 100 : 0;
  if (book.availableCopies === 0) {
    return { label: "Out of stock", tone: "dot-danger", ratio };
  }
  if (ratio <= 25) {
    return { label: "Low quantity", tone: "dot-warn", ratio };
  }
  return { label: "In stock", tone: "dot-ok", ratio };
}

type ChatBookCardsProps = {
  books: ChatBook[];
};

export function ChatBookCards({ books }: ChatBookCardsProps) {
  if (books.length === 0) return null;

  return (
    <ul
      aria-label="Recommended books"
      className="mt-3 grid w-full grid-cols-1 gap-2"
    >
      {books.map((book) => {
        const status = availability(book);
        const meta = [book.author, book.genre, book.publishedYear]
          .filter(Boolean)
          .join(" · ");

        return (
          <li className="chat-book-card w-full" key={book.id}>
            <article className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 shadow-sm">
              <div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Image
                  alt=""
                  className="h-10 w-10 object-contain"
                  height={40}
                  src="/book.png"
                  unoptimized
                  width={43}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-ink">{book.title}</h3>
                <p className="truncate text-xs text-muted">{meta}</p>
              </div>
              <div className="shrink-0">
                <div className="mb-1 flex items-center justify-end gap-2 text-[11px] font-medium text-ink">
                  <span>
                    {book.availableCopies} / {book.totalCopies}
                  </span>
                  <span className="badge">
                    <span className={`dot ${status.tone}`} />
                    {status.label}
                  </span>
                </div>
                <div className="meter ml-auto w-28" title={`${Math.round(status.ratio)}% available`}>
                  <span style={{ width: `${status.ratio}%` }} />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
