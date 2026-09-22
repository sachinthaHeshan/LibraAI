import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
  customType,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const bookSearchVectorSql = sql`
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(author, '')), 'A')
  || setweight(to_tsvector('simple', coalesce(isbn, '')), 'A')
  || setweight(to_tsvector('english', coalesce(genre, '')), 'B')
  || setweight(to_tsvector('english', coalesce(description, '')), 'C')
`;

export const memberStatusEnum = pgEnum("member_status", ["active", "inactive"]);
export const loanStatusEnum = pgEnum("loan_status", ["borrowed", "returned"]);
export const organizationPlanEnum = pgEnum("organization_plan", [
  "starter",
  "pro",
  "enterprise",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  plan: organizationPlanEnum("plan").notNull().default("pro"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const books = pgTable(
  "books",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    author: text("author").notNull(),
    isbn: text("isbn").notNull(),
    totalCopies: integer("total_copies").notNull(),
    availableCopies: integer("available_copies").notNull(),
    publishedYear: integer("published_year"),
    genre: text("genre"),
    description: text("description"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(bookSearchVectorSql),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("books_organization_id_isbn_uidx").on(t.organizationId, t.isbn),
    index("books_search_vector_idx").using("gin", t.searchVector),
  ],
);

export const bookApiColumns = {
  id: books.id,
  organizationId: books.organizationId,
  title: books.title,
  author: books.author,
  isbn: books.isbn,
  totalCopies: books.totalCopies,
  availableCopies: books.availableCopies,
  publishedYear: books.publishedYear,
  genre: books.genre,
  description: books.description,
  createdAt: books.createdAt,
  updatedAt: books.updatedAt,
};

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    membershipDate: date("membership_date").notNull(),
    status: memberStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("members_organization_id_email_uidx").on(t.organizationId, t.email),
  ],
);

export const loans = pgTable("loans", {
  id: uuid("id").defaultRandom().primaryKey(),
  bookId: uuid("book_id")
    .notNull()
    .references(() => books.id),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
  dueDate: date("due_date").notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true }),
  status: loanStatusEnum("status").notNull().default("borrowed"),
});
