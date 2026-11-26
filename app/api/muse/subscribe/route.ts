import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";

// Assina a conta do Instagram nos webhooks deste app (subscribed_apps).
// Protegido por segredo compartilhado no header x-muse-secret.
export async function POST(request: NextRequest) {
  if (request.headers.get("x-muse-secret") !== process.env.MUSE_API_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as { accountId?: string } | null;
  if (!body?.accountId) {
    return NextResponse.json({ error: "accountId obrigatorio" }, { status: 400 });
  }
  const db = getDb();
  const [account] = await db.select().from(igAccounts).where(eq(igAccounts.igUserId, body.accountId)).limit(1);
  if (!account || !account.active || !account.accessToken) {
    return NextResponse.json({ error: "conta nao encontrada ou sem token" }, { status: 404 });
  }
  const res = await fetch(
    `https://graph.instagram.com/v21.0/me/subscribed_apps?subscribed_fields=comments,mentions,messages&access_token=${encodeURIComponent(account.accessToken)}`,
    { method: "POST" },
  );
  const data = await res.json().catch(() => null);
  return NextResponse.json({ ok: res.ok, status: res.status, data });
}
