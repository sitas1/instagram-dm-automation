import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db";
import { activityLog, igAccounts } from "@/src/db/schema";
import { sendPrivateReply } from "@/src/lib/instagram";

// Endpoint interno para o Muse enviar a DM personalizada de um comentario.
// Protegido por segredo compartilhado no header x-muse-secret.
export async function POST(request: NextRequest) {
  if (request.headers.get("x-muse-secret") !== process.env.MUSE_API_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    accountId?: string;
    commentId?: string;
    message?: string;
  } | null;
  if (!body?.accountId || !body.commentId || !body.message) {
    return NextResponse.json({ error: "accountId, commentId e message obrigatorios" }, { status: 400 });
  }
  const db = getDb();
  const [account] = await db.select().from(igAccounts).where(eq(igAccounts.igUserId, body.accountId)).limit(1);
  if (!account || !account.active || !account.accessToken) {
    return NextResponse.json({ error: "conta nao encontrada ou sem token" }, { status: 404 });
  }
  const result = await sendPrivateReply(account.accessToken, account.igUserId, body.commentId, body.message);
  await db.insert(activityLog).values({
    igAccountId: account.id,
    eventType: "dm_sent",
    igCommentId: body.commentId,
    metadata: { message: body.message, response: result, via: "muse" },
  });
  return NextResponse.json({ ok: true });
}
