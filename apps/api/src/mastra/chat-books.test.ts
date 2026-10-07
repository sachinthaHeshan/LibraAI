import { describe, expect, it } from "vitest";
import {
  extractBookIdsFromToolResults,
  extractChatOptionsFromToolResults,
} from "./chat-books.js";

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

  it("extracts book ids from sub-agent tool results", () => {
    const ids = extractBookIdsFromToolResults([
      {
        payload: {
          toolName: "agent-borrowAgent",
          result: {
            text: "Borrowed.",
            subAgentToolResults: [
              {
                toolName: "borrowBook",
                result: {
                  borrowed: true,
                  bookId: "33333333-3333-4333-8333-333333333333",
                  title: "Dune",
                },
              },
            ],
          },
        },
      },
    ]);

    expect(ids).toEqual(["33333333-3333-4333-8333-333333333333"]);
  });

  it("skips the borrow agent's search candidates and keeps the chosen book", () => {
    const ids = extractBookIdsFromToolResults([
      {
        payload: {
          toolName: "agent-borrowAgent",
          result: {
            subAgentToolResults: [
              {
                toolName: "searchBooks",
                result: {
                  hits: [
                    { bookId: "44444444-4444-4444-8444-444444444444" },
                    { bookId: "55555555-5555-4555-8555-555555555555" },
                  ],
                },
              },
              {
                toolName: "getBook",
                result: {
                  found: true,
                  book: { id: "44444444-4444-4444-8444-444444444444", title: "Dune" },
                },
              },
            ],
          },
        },
      },
    ]);

    expect(ids).toEqual(["44444444-4444-4444-8444-444444444444"]);
  });

  it("extracts recommended book ids in ranked order", () => {
    const ids = extractBookIdsFromToolResults([
      {
        payload: {
          toolName: "agent-recommendationAgent",
          result: {
            subAgentToolResults: [
              {
                toolName: "recommendBooks",
                result: {
                  profile: { preferences: ["Fantasy"], recentlyBorrowed: ["The Hobbit"] },
                  recommendations: [
                    { bookId: "66666666-6666-4666-8666-666666666666", title: "Dune" },
                    { bookId: "77777777-7777-4777-8777-777777777777", title: "Emma" },
                  ],
                },
              },
            ],
          },
        },
      },
    ]);

    expect(ids).toEqual([
      "66666666-6666-4666-8666-666666666666",
      "77777777-7777-4777-8777-777777777777",
    ]);
  });

  it("ignores empty or unknown tool payloads", () => {
    expect(extractBookIdsFromToolResults([])).toEqual([]);
    expect(extractBookIdsFromToolResults([{ name: "other", result: { ok: true } }])).toEqual(
      [],
    );
  });
});

describe("extractChatOptionsFromToolResults", () => {
  it("finds loan duration options offered inside a sub-agent call", () => {
    const options = extractChatOptionsFromToolResults([
      {
        payload: {
          toolName: "agent-borrowAgent",
          result: {
            text: "It is available. How long do you need it?",
            subAgentToolResults: [
              {
                toolName: "offerLoanDurations",
                result: { loanDurationOptions: ["1 week", "2 weeks", "1 month"] },
              },
            ],
          },
        },
      },
    ]);

    expect(options).toEqual(["1 week", "2 weeks", "1 month"]);
  });

  it("returns no options when none were offered", () => {
    expect(extractChatOptionsFromToolResults([{ result: { found: true } }])).toEqual([]);
  });
});
