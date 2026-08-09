import { books, loans, members, type Db } from "@libra/db";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";

const loanParamsSchema = z.object({
  id: z.string().uuid(),
});

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });

const createLoanSchema = z.object({
  bookId: z.string().uuid(),
  memberId: z.string().uuid(),
  dueDate: calendarDateSchema,
});

const listLoansQuerySchema = z.object({
  status: z.enum(["borrowed", "returned"]).optional(),
});

export function createLoansRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post("/loans", async (request, reply) => {
      const input = createLoanSchema.parse(request.body);

      const loan = await db.transaction(async (tx) => {
        const [member] = await tx
          .select()
          .from(members)
          .where(eq(members.id, input.memberId))
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
          .where(eq(books.id, input.bookId))
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
        return created;
      });

      return reply.status(201).send(loan);
    });

    app.post("/loans/:id/return", async (request) => {
      const { id } = loanParamsSchema.parse(request.params);

      return db.transaction(async (tx) => {
        const [loan] = await tx
          .select()
          .from(loans)
          .where(eq(loans.id, id))
          .limit(1)
          .for("update");
        if (!loan) {
          throw new AppError(404, "Loan not found");
        }
        if (loan.status === "returned") {
          throw new AppError(400, "Loan already returned");
        }

        const [book] = await tx
          .select()
          .from(books)
          .where(eq(books.id, loan.bookId))
          .limit(1)
          .for("update");
        if (!book) {
          throw new AppError(404, "Book not found");
        }

        const returnedAt = new Date();
        const [returned] = await tx
          .update(loans)
          .set({ returnedAt, status: "returned" })
          .where(and(eq(loans.id, id), eq(loans.status, "borrowed")))
          .returning();
        if (!returned) {
          throw new AppError(400, "Loan already returned");
        }

        await tx
          .update(books)
          .set({
            availableCopies: book.availableCopies + 1,
            updatedAt: returnedAt,
          })
          .where(eq(books.id, loan.bookId));

        return returned;
      });
    });

    app.get("/loans", async (request) => {
      const { status } = listLoansQuerySchema.parse(request.query);
      const rows = await db
        .select({
          id: loans.id,
          bookId: loans.bookId,
          memberId: loans.memberId,
          issuedAt: loans.issuedAt,
          dueDate: loans.dueDate,
          returnedAt: loans.returnedAt,
          status: loans.status,
          book: {
            id: books.id,
            title: books.title,
          },
          member: {
            id: members.id,
            name: members.name,
          },
        })
        .from(loans)
        .innerJoin(books, eq(loans.bookId, books.id))
        .innerJoin(members, eq(loans.memberId, members.id))
        .where(status ? eq(loans.status, status) : undefined);
      const today = new Date().toISOString().slice(0, 10);

      return rows.map((loan) => ({
        ...loan,
        overdue: loan.status === "borrowed" && loan.dueDate < today,
      }));
    });
  };
}
