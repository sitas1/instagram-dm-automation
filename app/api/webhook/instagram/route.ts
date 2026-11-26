import { NextRequest, NextResponse, after } from "next/server";
import crypto from "node:crypto";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/src/db";
import { activityLog, automations, contacts, igAccounts } from "@/src/db/schema";
import { GraphApiError, postPublicReply, sendPrivateReply } from "@/src/lib/instagram";
import { matchesKeyword } from "@/src/lib/matching";

const MAX_COMMENT_TEXT_LENGTH = 2048;

interface InstagramCommentValue {
  id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
}

interface InstagramChange {
  field?: string;
  value?: InstagramCommentValue;
}

interface InstagramEntry {
  id?: string;
  time?: number;
  changes?: InstagramChange[];
}

interface InstagramWebhookPayload {
  object?: string;
  entry?: InstagramEntry[];
}

type Db = ReturnType<typeof getDb>;
type Automation = typeof automations.$inferSelect;
type IgAccount = typeof igAccounts.$inferSelect;

interface CommentContext {
  commentId: string;
  commentText: string;
  igUserId: string;
  igUsername: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

function isValidSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;

  const [scheme, signatureHex] = signatureHeader.split("=");
  if (scheme !== "sha256" || !signatureHex) return false;

  const expectedHex = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(signatureHex, "hex");

  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // A Meta reenvia o webhook se nao receber 200 em ~5s. Responde imediatamente
  // e faz todo o processamento (DB + Graph API) depois da resposta ser enviada.
  after(() => processWebhookPayload(payload));

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}

async function processWebhookPayload(payload: InstagramWebhookPayload) {
  const db = getDb();

  for (const entry of payload.entry ?? []) {
    // entry.id identifica de qual conta Instagram (das cadastradas em ig_accounts)
    // veio o evento -- nao existe mais uma conta global fixa.
    if (!entry.id) continue;

    const [account] = await db
      .select()
      .from(igAccounts)
      .where(eq(igAccounts.igUserId, entry.id))
      .limit(1);

    if (!account || !account.active) {
      console.warn(
        `Webhook Instagram: entry.id ${entry.id} nao corresponde a nenhuma ig_account ativa cadastrada -- evento descartado`,
      );
      continue;
    }

    for (const change of entry.changes ?? []) {
      if (change.field !== "comments" || !change.value) continue;

      const value = change.value;
      try {
        await processComment(db, account, value);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        console.error("Falha ao processar comentario do webhook Instagram", error);
        try {
          await db.insert(activityLog).values({
            igAccountId: account.id,
            eventType: "processing_error",
            igCommentId: value.id,
            commentText: (value.text ?? "").slice(0, MAX_COMMENT_TEXT_LENGTH),
            detail: message,
            metadata: { stack },
          });
        } catch (logError) {
          console.error("Falha ao gravar activityLog de erro de processamento", logError);
        }
      }
    }
  }
}

async function processComment(db: Db, account: IgAccount, value: InstagramCommentValue) {
  const commentId = value.id;
  const igUserId = value.from?.id;
  const igUsername = value.from?.username ?? null;
  const mediaId = value.media?.id;
  const commentText = (value.text ?? "").slice(0, MAX_COMMENT_TEXT_LENGTH);

  if (!commentId || !igUserId) return;

  // evita a automacao responder a comentarios feitos pela propria conta (loop infinito)
  if (igUserId === account.igUserId) return;

  // ignora respostas aninhadas a outros comentarios
  if (value.parent_id) return;

  // idempotencia: se a Meta reentregar o mesmo comentario (retry), o insert conflita
  // com o indice unico parcial e o evento e descartado silenciosamente.
  const [inserted] = await db
    .insert(activityLog)
    .values({
      igAccountId: account.id,
      eventType: "comment_received",
      igCommentId: commentId,
      commentText,
      metadata: value,
    })
    .onConflictDoNothing({
      target: activityLog.igCommentId,
      where: sql`${activityLog.eventType} = 'comment_received'`,
    })
    .returning({ id: activityLog.id });

  if (!inserted) return;

  const candidateAutomations = await db
    .select()
    .from(automations)
    .where(
      and(
        eq(automations.igAccountId, account.id),
        eq(automations.active, true),
        mediaId
          ? or(isNull(automations.targetMediaId), eq(automations.targetMediaId, mediaId))
          : isNull(automations.targetMediaId),
      ),
    );

  const matchedAutomations = candidateAutomations.filter((automation) =>
    matchesKeyword(commentText, automation.keyword),
  );

  const ctx: CommentContext = { commentId, commentText, igUserId, igUsername };

  for (const automation of matchedAutomations) {
    try {
      await processAutomationMatch(db, account, automation, ctx);
    } catch (error) {
      console.error("Falha ao processar automation no webhook Instagram", error);
    }
  }
}

async function processAutomationMatch(
  db: Db,
  account: IgAccount,
  automation: Automation,
  ctx: CommentContext,
) {
  const { commentId, commentText, igUserId, igUsername } = ctx;

  const [contact] = await db
    .insert(contacts)
    .values({ igAccountId: account.id, igUserId, igUsername })
    .onConflictDoUpdate({
      target: [contacts.igAccountId, contacts.igUserId],
      set: { igUsername },
    })
    .returning();

  if (automation.oncePerContact) {
    const [previousDm] = await db
      .select({ id: activityLog.id })
      .from(activityLog)
      .where(
        and(
          eq(activityLog.automationId, automation.id),
          eq(activityLog.contactId, contact.id),
          eq(activityLog.eventType, "dm_sent"),
        ),
      )
      .limit(1);

    if (previousDm) {
      await db.insert(activityLog).values({
        igAccountId: account.id,
        automationId: automation.id,
        contactId: contact.id,
        eventType: "cooldown_skipped",
        igCommentId: commentId,
        commentText,
        detail: "oncePerContact: contato ja recebeu DM desta automation",
      });
      return;
    }
  } else if (automation.cooldownMinutes > 0 && contact.lastContactedAt) {
    const minutesSinceLastContact =
      (Date.now() - contact.lastContactedAt.getTime()) / 60_000;

    if (minutesSinceLastContact < automation.cooldownMinutes) {
      const minutesRemaining = Math.round(
        automation.cooldownMinutes - minutesSinceLastContact,
      );
      await db.insert(activityLog).values({
        igAccountId: account.id,
        automationId: automation.id,
        contactId: contact.id,
        eventType: "cooldown_skipped",
        igCommentId: commentId,
        commentText,
        detail: `cooldown ativo (${automation.cooldownMinutes} min): ${minutesRemaining} min restantes`,
      });
      return;
    }
  }

  // Modo Muse: dmMessage "__MUSE__" nao envia texto fixo. Emite o evento para a
  // ponte do Muse (n8n), que le o perfil, compoe a DM personalizada e envia
  // depois via POST /api/muse/send.
  if (automation.dmMessage === "__MUSE__") {
    if (process.env.MUSE_WEBHOOK_URL) {
      await fetch(process.env.MUSE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: account.igUserId,
          igUserId,
          username: igUsername ?? "",
          commentId,
          commentText,
          mediaId: "",
          automationId: automation.id,
        }),
      }).catch((error) => console.error("Falha ao emitir evento para o Muse", error));
    }
    await db.insert(activityLog).values({
      igAccountId: account.id,
      automationId: automation.id,
      contactId: contact.id,
      eventType: "comment_received",
      igCommentId: commentId,
      commentText,
      detail: "muse_pending",
    }).catch(() => undefined);
    return;
  }
  try {
    if (!account.accessToken) {
      throw new Error("Conta Instagram sem access token configurado");
    }
    const result = await sendPrivateReply(
      account.accessToken,
      account.igUserId,
      commentId,
      automation.dmMessage,
    );
    await db
      .update(contacts)
      .set({ lastContactedAt: new Date() })
      .where(eq(contacts.id, contact.id));
    await db.insert(activityLog).values({
      igAccountId: account.id,
      automationId: automation.id,
      contactId: contact.id,
      eventType: "dm_sent",
      igCommentId: commentId,
      commentText,
      metadata: { message: automation.dmMessage, response: result },
    });
  } catch (error) {
    await db.insert(activityLog).values({
      igAccountId: account.id,
      automationId: automation.id,
      contactId: contact.id,
      eventType: "dm_failed",
      igCommentId: commentId,
      commentText,
      detail: error instanceof Error ? error.message : String(error),
      metadata: error instanceof GraphApiError ? error.body : undefined,
    });
  }

  if (automation.publicReplyMessage) {
    try {
      if (!account.accessToken) {
        throw new Error("Conta Instagram sem access token configurado");
      }
      const result = await postPublicReply(
        account.accessToken,
        commentId,
        automation.publicReplyMessage,
      );
      await db.insert(activityLog).values({
        igAccountId: account.id,
        automationId: automation.id,
        contactId: contact.id,
        eventType: "reply_posted",
        igCommentId: commentId,
        commentText,
        metadata: { message: automation.publicReplyMessage, response: result },
      });
    } catch (error) {
      await db.insert(activityLog).values({
        igAccountId: account.id,
        automationId: automation.id,
        contactId: contact.id,
        eventType: "reply_failed",
        igCommentId: commentId,
        commentText,
        detail: error instanceof Error ? error.message : String(error),
        metadata: error instanceof GraphApiError ? error.body : undefined,
      });
    }
  }
}
