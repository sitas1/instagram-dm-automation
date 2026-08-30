import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/src/db";
import {
  activityLog,
  automations,
  contacts,
  igAccounts,
} from "@/src/db/schema";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function getDmStats(from: Date, to?: Date) {
  const db = getDb();
  const [row] = await db
    .select({
      sent: sql<number>`count(*) filter (where ${activityLog.eventType} = 'dm_sent')`.mapWith(
        Number
      ),
      failed: sql<number>`count(*) filter (where ${activityLog.eventType} = 'dm_failed')`.mapWith(
        Number
      ),
    })
    .from(activityLog)
    .where(
      to
        ? and(gte(activityLog.createdAt, from), lt(activityLog.createdAt, to))
        : gte(activityLog.createdAt, from)
    );
  return { sent: row?.sent ?? 0, failed: row?.failed ?? 0 };
}

export async function getDashboardKpis() {
  const db = getDb();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const fourteenDaysAgo = new Date(now.getTime() - 2 * SEVEN_DAYS_MS);

  const [current, previous] = await Promise.all([
    getDmStats(sevenDaysAgo),
    getDmStats(fourteenDaysAgo, sevenDaysAgo),
  ]);

  const [{ value: activeAutomations }] = await db
    .select({ value: count() })
    .from(automations)
    .where(eq(automations.active, true));

  const [{ value: newContactsCurrent }] = await db
    .select({ value: count() })
    .from(contacts)
    .where(gte(contacts.firstSeenAt, sevenDaysAgo));

  const [{ value: newContactsPrevious }] = await db
    .select({ value: count() })
    .from(contacts)
    .where(
      and(
        gte(contacts.firstSeenAt, fourteenDaysAgo),
        lt(contacts.firstSeenAt, sevenDaysAgo)
      )
    );

  const currentAttempts = current.sent + current.failed;
  const previousAttempts = previous.sent + previous.failed;

  return {
    dmSent7d: { value: current.sent, previous: previous.sent },
    failureRate7d: {
      value: currentAttempts > 0 ? current.failed / currentAttempts : 0,
      previous: previousAttempts > 0 ? previous.failed / previousAttempts : 0,
    },
    activeAutomations,
    newContacts7d: { value: newContactsCurrent, previous: newContactsPrevious },
  };
}

export async function getRecentActivity(limit = 10) {
  const db = getDb();
  return db
    .select({
      id: activityLog.id,
      eventType: activityLog.eventType,
      detail: activityLog.detail,
      createdAt: activityLog.createdAt,
      accountUsername: igAccounts.username,
      accountIgUserId: igAccounts.igUserId,
    })
    .from(activityLog)
    .innerJoin(igAccounts, eq(activityLog.igAccountId, igAccounts.id))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

export async function getAccountsHealth() {
  const db = getDb();
  return db
    .select({
      id: igAccounts.id,
      username: igAccounts.username,
      igUserId: igAccounts.igUserId,
      active: igAccounts.active,
      tokenExpiresAt: igAccounts.tokenExpiresAt,
      hasToken: sql<boolean>`${igAccounts.accessToken} is not null`,
    })
    .from(igAccounts)
    .orderBy(igAccounts.username);
}
