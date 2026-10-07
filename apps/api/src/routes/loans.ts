import { books, loans, members, type Db } from "@libra/db";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { calendarDateSchema } from "../lib/calendar-date.js";
import { createLoan } from "../lib/create-loan.js";
import { LOAN_DURATIONS, dueDateFor } from "../lib/loan-durations.js";
import { AppError } from "../lib/errors.js";
import { accountRole, requireMemberId, requireOrgId } from "../lib/org.js";

const loanParamsSchema = z.object({
  id: z.string().uuid(),
});

const createLoanSchema = z.object({
  bookId: z.string().uuid(),
  memberId: z.string().uuid(),
  dueDate: calendarDateSchema,
});

const borrowSchema = z.object({
  bookId: z.string().uuid(),
  duration: z.enum(LOAN_DURATIONS),
});

const listLoansQuerySchema = z.object({
  status: z.enum(["borrowed", "returned"]).optional(),
});

export function createLoansRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.post("/loans", { preHandler: app.requireOwner }, async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = createLoanSchema.parse(request.body);

      const { loan } = await createLoan(db, orgId, input);

      return reply.status(201).send(loan);
    });

    /** A member borrows a book for themselves. */
    app.post("/loans/borrow", async (request, reply) => {
      const orgId = requireOrgId(request);
      const memberId = requireMemberId(request);
      const { bookId, duration } = borrowSchema.parse(request.body);

      const { loan } = await createLoan(db, orgId, {
        bookId,
        memberId,
        dueDate: dueDateFor(duration),
      });

      return reply.status(201).send(loan);
    });

    app.post("/loans/:id/return", { preHandler: app.requireOwner }, async (request) => {
      const orgId = requireOrgId(request);
      const { id } = loanParamsSchema.parse(request.params);

      return db.transaction(async (tx) => {
        const [loan] = await tx
          .select({
            id: loans.id,
            bookId: loans.bookId,
            memberId: loans.memberId,
            issuedAt: loans.issuedAt,
            dueDate: loans.dueDate,
            returnedAt: loans.returnedAt,
            status: loans.status,
          })
          .from(loans)
          .innerJoin(books, eq(loans.bookId, books.id))
          .innerJoin(members, eq(loans.memberId, members.id))
          .where(
            and(
              eq(loans.id, id),
              eq(books.organizationId, orgId),
              eq(members.organizationId, orgId),
            ),
          )
          .limit(1)
          .for("update");
        if (!loan) {
          throw new AppError(404, "Loan not found");
        }

        const [book] = await tx
          .select()
          .from(books)
          .where(
            and(
              eq(books.id, loan.bookId),
              eq(books.organizationId, orgId),
            ),
          )
          .limit(1)
          .for("update");
        if (!book) {
          throw new AppError(404, "Loan not found");
        }
        if (loan.status === "returned") {
          throw new AppError(400, "Loan already returned");
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

    // Owners see every loan in the library; members see only their own.
    app.get("/loans", async (request) => {
      const orgId = requireOrgId(request);
      const ownMemberId =
        accountRole(request) === "member" ? request.user.sub : undefined;
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
        .where(
          and(
            eq(books.organizationId, orgId),
            eq(members.organizationId, orgId),
            status ? eq(loans.status, status) : undefined,
            ownMemberId ? eq(loans.memberId, ownMemberId) : undefined,
          ),
        );
      const today = new Date().toISOString().slice(0, 10);

      return rows.map((loan) => ({
        ...loan,
        overdue: loan.status === "borrowed" && loan.dueDate < today,
      }));
    });
  };
}
