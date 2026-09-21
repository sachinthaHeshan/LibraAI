import type { ChatBook } from "@/lib/chat";

const COVER_TONES = [
  "from-[#60a5fa] to-[#2563eb]",
  "from-[#818cf8] to-[#4f46e5]",
  "from-[#a78bfa] to-[#7c3aed]",
  "from-[#38bdf8] to-[#0284c7]",
];

function coverTone(title: string): string {
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COVER_TONES[hash % COVER_TONES.length]!;
}

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
  compact?: boolean;
};

export function ChatBookCards({ books, compact = false }: ChatBookCardsProps) {
  if (books.length === 0) return null;

  return (
    <ul
      aria-label="Recommended books"
      className={`mt-3 grid gap-2.5 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}
    >
      {books.map((book) => {
        const status = availability(book);
        const meta = [book.author, book.genre, book.publishedYear]
          .filter(Boolean)
          .join(" · ");

        return (
          <li className="chat-book-card" key={book.id}>
            <article className="flex gap-3 rounded-2xl border border-line bg-white p-3 shadow-sm">
              <div
                aria-hidden
                className={`flex h-[4.75rem] w-[3.15rem] shrink-0 items-center justify-center rounded-md bg-gradient-to-br shadow-[inset_3px_0_0_rgba(255,255,255,0.25)] ${coverTone(book.title)} text-base font-bold text-white`}
              >
                {book.title.trim().charAt(0) || "B"}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-ink">{book.title}</h3>
                <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>
                {book.description && !compact ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#4b5563]">
                    {book.description}
                  </p>
                ) : null}
                <div className="mt-2">
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-ink">
                    <span>
                      {book.availableCopies} / {book.totalCopies}
                    </span>
                    <span className="badge">
                      <span className={`dot ${status.tone}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="meter" title={`${Math.round(status.ratio)}% available`}>
                    <span style={{ width: `${status.ratio}%` }} />
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
