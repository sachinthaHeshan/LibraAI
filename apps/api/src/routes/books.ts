import { books, type Db } from "@libra/db";
import { eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { AppError } from "../lib/errors.js";

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

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export function createBooksRoutes(db: Db): FastifyPluginAsync {
  return async (app) => {
    app.addHook("preHandler", app.authenticate);

    app.get("/books", async (request) => {
      const { q } = listBooksQuerySchema.parse(request.query);

      return db.query.books.findMany({
        where: q
          ? (book, { ilike, or }) =>
              or(
                ilike(book.title, `%${q}%`),
                ilike(book.author, `%${q}%`),
                ilike(book.isbn, `%${q}%`),
              )
          : undefined,
      });
    });

    app.get("/books/:id", async (request) => {
      const { id } = bookParamsSchema.parse(request.params);
      const book = await db.query.books.findFirst({
        where: (book, { eq }) => eq(book.id, id),
      });

      if (!book) {
        throw new AppError(404, "Book not found");
      }

      return book;
    });

    app.post("/books", async (request, reply) => {
      const input = createBookSchema.parse(request.body);

      try {
        const [book] = await db
          .insert(books)
          .values({ ...input, availableCopies: input.totalCopies })
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
      const { id } = bookParamsSchema.parse(request.params);
      const input = updateBookSchema.parse(request.body);

      try {
        return await db.transaction(async (tx) => {
          const [current] = await tx
            .select()
            .from(books)
            .where(eq(books.id, id))
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
            .where(eq(books.id, id))
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
      const { id } = bookParamsSchema.parse(request.params);
      const openLoan = await db.query.loans.findFirst({
        where: (loan, { and, eq }) =>
          and(eq(loan.bookId, id), eq(loan.status, "borrowed")),
      });

      if (openLoan) {
        throw new AppError(409, "Book has open loans");
      }

      const [deleted] = await db
        .delete(books)
        .where(eq(books.id, id))
        .returning({ id: books.id });

      if (!deleted) {
        throw new AppError(404, "Book not found");
      }

      return reply.status(204).send();
    });
  };
}
