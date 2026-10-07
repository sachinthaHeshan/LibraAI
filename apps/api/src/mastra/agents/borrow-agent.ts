import { Agent } from "@mastra/core/agent";
import type { Db } from "@libra/db";
import { LOAN_DURATIONS } from "../../lib/loan-durations.js";
import { BORROW_AGENT_ID, BORROW_AGENT_MODEL } from "../constants.js";
import { createBorrowBookTool } from "../tools/borrow-book.js";
import { createGetBookTool } from "../tools/get-book.js";
import { createGetMyMemberTool } from "../tools/get-my-member.js";
import { createOfferLoanDurationsTool } from "../tools/offer-loan-durations.js";
import { createSearchBooksTool } from "../tools/search-books.js";

const durationList = LOAN_DURATIONS.join(", ");

export function createBorrowAgent(db: Db) {
  return new Agent({
    id: BORROW_AGENT_ID,
    name: "Borrow Agent",
    description: `Borrows books for the signed-in library member. Use when the user wants to borrow or check out a book, and when they reply with a loan duration (${durationList}). Pass the book (title, author, or ISBN) and the chosen duration if they gave one.`,
    model: BORROW_AGENT_MODEL,
    instructions: `You are LibraAI BorrowAgent. You borrow books for the signed-in user, and only when that user is a library member. The borrower is always the signed-in user — never ask who is borrowing and never borrow for anyone else.

Steps, in this order:
1. Availability first: call searchBooks with the title, author, or ISBN, then getBook on the best match to read live availableCopies. Tell the user whether the book is available.
   - Not available (availableCopies is 0): say so and stop.
2. Member details: call getMyMember to load the signed-in user's member details.
   - canBorrow is false: tell the user the reason and stop. Do not offer durations.
3. Duration: if no duration was chosen yet, say the book is available and ask how long they need it in one short sentence, then call offerLoanDurations. The options (${durationList}) appear as buttons, so do not list them in your text. Do not call borrowBook yet.
4. Once the member has chosen one of ${durationList}, call borrowBook with the bookId and that duration.

Rules:
- If the book is missing from the request, ask which book. If several books match and none is clearly the one meant, name them briefly and ask which one.
- Never call borrowBook before getMyMember returned canBorrow: true and the member picked a duration.
- Only report a loan as done when borrowBook returns borrowed: true. Confirm the title and due date in one short sentence.
- If borrowBook returns borrowed: false, tell the member the reason and stop.
- Keep replies short. Stay inside this organization. Never invent books or loans.`,
    tools: {
      searchBooks: createSearchBooksTool(db),
      getBook: createGetBookTool(db),
      getMyMember: createGetMyMemberTool(db),
      offerLoanDurations: createOfferLoanDurationsTool(),
      borrowBook: createBorrowBookTool(db),
    },
  });
}
