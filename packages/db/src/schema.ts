import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  pgEnum,
  primaryKey,
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
    /** Set when the member signed up for their own login. Staff-created members have none. */
    passwordHash: text("password_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("members_organization_id_email_uidx").on(t.organizationId, t.email),
    uniqueIndex("members_login_email_uidx")
      .on(t.email)
      .where(sql`${t.passwordHash} is not null`),
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

/** Reading-preference tags a member picked. Tag keys come from the API's preference catalog. */
export const memberPreferences = pgTable(
  "member_preferences",
  {
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.tag] })],
);

/** One run of the recommendation agent for a member (the overview's "Recommended for you"). */
export const recommendationBatches = pgTable(
  "recommendation_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    summary: text("summary"),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("recommendation_batches_member_generated_idx").on(t.memberId, t.generatedAt)],
);

export const recommendationItems = pgTable(
  "recommendation_items",
  {
    batchId: uuid("batch_id")
      .notNull()
      .references(() => recommendationBatches.id, { onDelete: "cascade" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    reasons: text("reasons").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [primaryKey({ columns: [t.batchId, t.bookId] })],
);

export const aiAuditOutcomeEnum = pgEnum("ai_audit_outcome", [
  "completed",
  "refused",
  "rate_limited",
  "failed",
]);

/**
 * Append-only record of each AI chat turn. Stores who asked, what the AI did, and a digest
 * of the input — never the raw message, emails, phone numbers, or tokens.
 */
export const aiAuditEvents = pgTable(
  "ai_audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: uuid("actor_id").notNull(),
    actorRole: text("actor_role").notNull(),
    outcome: aiAuditOutcomeEnum("outcome").notNull(),
    refusalCode: text("refusal_code"),
    agentIds: text("agent_ids").array().notNull().default(sql`'{}'::text[]`),
    toolIds: text("tool_ids").array().notNull().default(sql`'{}'::text[]`),
    /** SHA-256 of the user's message, so repeated prompts can be correlated without storing them. */
    inputDigest: text("input_digest").notNull(),
    inputChars: integer("input_chars").notNull(),
    piiRedactions: integer("pii_redactions").notNull().default(0),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_audit_events_org_created_idx").on(t.organizationId, t.createdAt)],
);
