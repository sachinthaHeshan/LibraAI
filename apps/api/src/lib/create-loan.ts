import { books, loans, members, type Db } from "@libra/db";
import { and, eq } from "drizzle-orm";
import { AppError } from "./errors.js";

export type CreateLoanInput = {
  bookId: string;
  memberId: string;
  dueDate: string;
};

export async function createLoan(db: Db, orgId: string, input: CreateLoanInput) {
  return db.transaction(async (tx) => {
    const [member] = await tx
      .select()
      .from(members)
      .where(
        and(
          eq(members.id, input.memberId),
          eq(members.organizationId, orgId),
        ),
      )
      .limit(1)
      .for("update");
    if (!member) {
      throw new AppError(404, "Member not found");
    }
    if (member.status !== "active") {
      throw new AppError(400, "Member is inactive");
    }

    const [book] = await tx
      .select()
      .from(books)
      .where(
        and(
          eq(books.id, input.bookId),
          eq(books.organizationId, orgId),
        ),
      )
      .limit(1)
      .for("update");
    if (!book) {
      throw new AppError(404, "Book not found");
    }
    if (book.availableCopies < 1) {
      throw new AppError(400, "No copies available");
    }

    await tx
      .update(books)
      .set({
        availableCopies: book.availableCopies - 1,
        updatedAt: new Date(),
      })
      .where(eq(books.id, input.bookId));

    const [created] = await tx.insert(loans).values(input).returning();
    return { loan: created, book, member };
  });
}
