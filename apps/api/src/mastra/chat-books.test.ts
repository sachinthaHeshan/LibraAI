import { describe, expect, it } from "vitest";
import { extractBookIdsFromToolResults } from "./chat-books.js";

describe("extractBookIdsFromToolResults", () => {
  it("collects ids from get-book results and search metadata", () => {
    const ids = extractBookIdsFromToolResults([
      {
        name: "searchBooks",
        result: {
          relevantContext: [
            { bookId: "11111111-1111-4111-8111-111111111111", title: "The Hobbit" },
            { bookId: "22222222-2222-4222-8222-222222222222", title: "Dune" },
          ],
        },
      },
      {
        type: "tool-result",
        payload: {
          toolName: "getBook",
          result: {
            found: true,
            book: {
              id: "11111111-1111-4111-8111-111111111111",
              title: "The Hobbit",
            },
          },
        },
      },
    ]);

    expect(ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("ignores empty or unknown tool payloads", () => {
    expect(extractBookIdsFromToolResults([])).toEqual([]);
    expect(extractBookIdsFromToolResults([{ name: "other", result: { ok: true } }])).toEqual(
      [],
    );
  });
});
