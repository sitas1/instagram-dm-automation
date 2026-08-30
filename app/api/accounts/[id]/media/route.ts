import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
import { GraphApiError, listRecentMedia } from "@/src/lib/instagram";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SimplifiedMedia {
  id: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  mediaType: string | null;
}

// Usada pelo painel pra listar posts recentes da conta e permitir selecionar
// visualmente o targetMediaId de uma automation, em vez de colar o ID manualmente.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "ID de conta inválido." }, { status: 400 });
  }

  const db = getDb();
  const [account] = await db
    .select({ igUserId: igAccounts.igUserId, accessToken: igAccounts.accessToken })
    .from(igAccounts)
    .where(eq(igAccounts.id, id))
    .limit(1);

  if (!account) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  if (!account.accessToken) {
    return NextResponse.json(
      { error: "Conta sem access token configurado." },
      { status: 400 },
    );
  }

  try {
    const items = await listRecentMedia(account.accessToken, account.igUserId);

    const media: SimplifiedMedia[] = items.map((item) => ({
      id: item.id,
      thumbnailUrl:
        (item.media_type === "VIDEO" ? item.thumbnail_url : item.media_url) ?? null,
      caption: item.caption ? item.caption.slice(0, 80) : null,
      permalink: item.permalink ?? null,
      mediaType: item.media_type ?? null,
    }));

    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof GraphApiError) {
      console.error("Falha ao buscar media do Instagram via Graph API", error.body);
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    console.error("Falha inesperada ao buscar media recente do Instagram", error);
    return NextResponse.json(
      { error: "Falha ao buscar posts do Instagram." },
      { status: 502 },
    );
  }
}
