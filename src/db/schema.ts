import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const igAccounts = pgTable(
  "ig_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Instagram-scoped Business Account ID
    igUserId: text("ig_user_id").notNull(),
    username: text("username"),
    // token de longa duracao dessa conta (gerenciado pelo painel admin)
    accessToken: text("access_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("ig_accounts_ig_user_id_idx").on(table.igUserId)],
);

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  igAccountId: uuid("ig_account_id")
    .notNull()
    .references(() => igAccounts.id),
  name: text("name").notNull(),
  // null targetMediaId = applies to any post/reel on the account
  targetMediaId: text("target_media_id"),
  targetMediaCaption: text("target_media_caption"),
  // null keyword = matches any comment
  keyword: text("keyword"),
  dmMessage: text("dm_message").notNull(),
  publicReplyMessage: text("public_reply_message"),
  active: boolean("active").notNull().default(true),
  // minutos de espera antes de reenviar DM ao mesmo contato; 0 = sem limite
  cooldownMinutes: integer("cooldown_minutes").notNull().default(1440),
  // se true, contato so recebe DM desta automation uma unica vez (ignora cooldownMinutes)
  oncePerContact: boolean("once_per_contact").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    igAccountId: uuid("ig_account_id")
      .notNull()
      .references(() => igAccounts.id),
    igUserId: text("ig_user_id").notNull(),
    igUsername: text("ig_username"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  },
  (table) => [
    // a mesma pessoa pode comentar em contas diferentes -- sao contatos distintos,
    // cada um com seu proprio cooldown/oncePerContact
    uniqueIndex("contacts_ig_account_id_ig_user_id_idx").on(
      table.igAccountId,
      table.igUserId,
    ),
  ],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // sempre preenchido: a conta ja e resolvida antes de qualquer linha ser gravada
    // (eventos de conta nao cadastrada/inativa sao descartados antes de chegar aqui)
    igAccountId: uuid("ig_account_id")
      .notNull()
      .references(() => igAccounts.id),
    automationId: uuid("automation_id").references(() => automations.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    // comment_received | dm_sent | dm_failed | reply_posted | reply_failed | cooldown_skipped | processing_error
    eventType: text("event_type").notNull(),
    igCommentId: text("ig_comment_id"),
    commentText: text("comment_text"),
    detail: text("detail"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // garante que um mesmo comentario do webhook so seja processado uma vez,
    // mesmo se a Meta reenviar a entrega (retry por timeout, etc)
    uniqueIndex("activity_log_comment_received_idx")
      .on(table.igCommentId)
      .where(sql`${table.eventType} = 'comment_received'`),
    index("activity_log_created_at_idx").on(table.createdAt.desc()),
    index("activity_log_automation_id_idx").on(table.automationId),
  ],
);
