import { books, loans, type Db } from "@libra/db";
import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";
import { isUniqueViolation } from "../lib/pg.js";
import { requireOrgId } from "../lib/org.js";

const bookParamsSchema = z.object({
  id: z.string().uuid(),
});

const listBooksQuerySchema = z.object({
  q: z.string().optional(),
});

const createBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().min(1),
  totalCopies: z.number().int().min(1),
  publishedYear: z.number().int().optional(),
});

const updateBookSchema = createBookSchema
  .partial()
  .refine((update) => Object.keys(update).length > 0);

export function createBooksRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get("/books", async (request) => {
      const orgId = requireOrgId(request);
      const { q } = listBooksQuerySchema.parse(request.query);

      return db.query.books.findMany({
        where: and(
          eq(books.organizationId, orgId),
          q
            ? or(
                ilike(books.title, `%${q}%`),
                ilike(books.author, `%${q}%`),
                ilike(books.isbn, `%${q}%`),
              )
            : undefined,
        ),
      });
    });

    app.get("/books/:id", async (request) => {
      const orgId = requireOrgId(request);
      const { id } = bookParamsSchema.parse(request.params);
      const book = await db.query.books.findFirst({
        where: and(eq(books.id, id), eq(books.organizationId, orgId)),
      });

      if (!book) {
        throw new AppError(404, "Book not found");
      }

      return book;
    });

    app.post("/books", async (request, reply) => {
      const orgId = requireOrgId(request);
      const input = createBookSchema.parse(request.body);

      try {
        const [book] = await db
          .insert(books)
          .values({
            ...input,
            organizationId: orgId,
            availableCopies: input.totalCopies,
          })
          .returning();

        return reply.status(201).send(book);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "ISBN already exists");
        }
        throw error;
      }
    });

    app.patch("/books/:id", async (request) => {
      const orgId = requireOrgId(request);
      const { id } = bookParamsSchema.parse(request.params);
      const input = updateBookSchema.parse(request.body);

      try {
        return await db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(books)
            .where(and(eq(books.id, id), eq(books.organizationId, orgId)))
            .limit(1)
            .for("update");

          if (!current) {
            throw new AppError(404, "Book not found");
          }

          const borrowedCopies =
            current.totalCopies - current.availableCopies;
          if (
            input.totalCopies !== undefined &&
            input.totalCopies < borrowedCopies
          ) {
            throw new AppError(
              400,
              "Total copies cannot be below borrowed copies",
            );
          }

          const update = {
            ...input,
            ...(input.totalCopies === undefined
              ? {}
              : { availableCopies: input.totalCopies - borrowedCopies }),
            updatedAt: new Date(),
          };
          const [book] = await tx
            .update(books)
            .set(update)
            .where(and(eq(books.id, id), eq(books.organizationId, orgId)))
            .returning();

          return book;
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new AppError(409, "ISBN already exists");
        }
        throw error;
      }
    });

    app.delete("/books/:id", async (request, reply) => {
      const orgId = requireOrgId(request);
      const { id } = bookParamsSchema.parse(request.params);
      const book = await db.query.books.findFirst({
        where: and(eq(books.id, id), eq(books.organizationId, orgId)),
      });
      if (!book) {
        throw new AppError(404, "Book not found");
      }

      const loanHistory = await db.query.loans.findFirst({
        where: eq(loans.bookId, id),
      });

      if (loanHistory) {
        throw new AppError(409, "Book has loan history");
      }

      const [deleted] = await db
        .delete(books)
        .where(and(eq(books.id, id), eq(books.organizationId, orgId)))
        .returning({ id: books.id });

      if (!deleted) {
        throw new AppError(404, "Book not found");
      }

      return reply.status(204).send();
    });
  };
}
