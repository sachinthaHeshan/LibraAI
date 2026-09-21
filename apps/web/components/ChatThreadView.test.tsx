import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WELCOME_COPY, createChatMessage } from "@/lib/chat";

import { ChatThreadView } from "./ChatThreadView";

describe("ChatThreadView", () => {
  it("shows welcome copy when the thread is empty", () => {
    const html = renderToStaticMarkup(
      <ChatThreadView messages={[]} sending={false} onSend={vi.fn()} />,
    );
    expect(html).toContain(WELCOME_COPY);
    expect(html).toContain("ask-shell-composer");
  });

  it("renders user and assistant messages and a thinking state", () => {
    const html = renderToStaticMarkup(
      <ChatThreadView
        messages={[
          createChatMessage("user", "Find Tolkien", 1),
          createChatMessage("assistant", "The Hobbit is in stock.", 2),
        ]}
        sending
        onSend={vi.fn()}
      />,
    );
    expect(html).toContain("Find Tolkien");
    expect(html).toContain("The Hobbit is in stock.");
    expect(html).toContain("Thinking");
    expect(html).toContain("thinking-indicator");
  });

  it("renders recommended books as cards", () => {
    const html = renderToStaticMarkup(
      <ChatThreadView
        messages={[
          createChatMessage(
            "assistant",
            "Here are a few Tolkien titles.",
            2,
            [
              {
                id: "11111111-1111-4111-8111-111111111111",
                title: "The Hobbit",
                author: "J. R. R. Tolkien",
                isbn: "9780547928227",
                genre: "Fantasy",
                description: "A hobbit joins dwarves on a quest.",
                publishedYear: 1937,
                totalCopies: 4,
                availableCopies: 2,
              },
            ],
          ),
        ]}
        sending={false}
        onSend={vi.fn()}
      />,
    );
    expect(html).toContain("Here are a few Tolkien titles.");
    expect(html).toContain("chat-book-card");
    expect(html).toContain("The Hobbit");
    expect(html).toContain("In stock");
  });
});
