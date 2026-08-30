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

export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
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
    igUserId: text("ig_user_id").notNull(),
    igUsername: text("ig_username"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("contacts_ig_user_id_idx").on(table.igUserId)],
);

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automationId: uuid("automation_id").references(() => automations.id, {
      onDelete: "set null",
    }),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    // comment_received | dm_sent | dm_failed | reply_posted | reply_failed | cooldown_skipped
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
