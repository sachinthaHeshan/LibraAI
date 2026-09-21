import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("books_organization_id_isbn_uidx").on(t.organizationId, t.isbn),
  ],
);

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
