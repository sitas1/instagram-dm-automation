const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

interface GraphApiErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class GraphApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "GraphApiError";
    this.status = status;
    this.body = body;
  }
}

async function graphApiPost(
  path: string,
  accessToken: string,
  params: Record<string, string>,
) {
  const body = new URLSearchParams({ ...params, access_token: accessToken });

  const res = await fetch(`${GRAPH_API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json().catch(() => ({}))) as GraphApiErrorBody & Record<string, unknown>;

  if (!res.ok) {
    const message =
      data?.error?.message ?? `Graph API request failed with status ${res.status}`;
    throw new GraphApiError(message, res.status, data);
  }

  return data;
}

// Private reply a um comentario chega ao usuario como DM no Instagram.
// Endpoint da Instagram Platform API (Instagram Login): POST /{ig-user-id}/messages
// com recipient.comment_id -- igUserId e accessToken sao os da conta Instagram dona
// do comentario (resolvida via ig_accounts), nao ha mais conta/token globais.
export function sendPrivateReply(
  accessToken: string,
  igUserId: string,
  commentId: string,
  message: string,
) {
  return graphApiPost(`${igUserId}/messages`, accessToken, {
    recipient: JSON.stringify({ comment_id: commentId }),
    message: JSON.stringify({ text: message }),
  });
}

// Resposta publica visivel no proprio comentario.
export function postPublicReply(accessToken: string, commentId: string, message: string) {
  return graphApiPost(`${commentId}/replies`, accessToken, { message });
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
}

// Lista os posts/reels mais recentes da conta, usados no painel pra selecao visual
// do targetMediaId de uma automation (em vez de colar o ID manualmente).
export async function listRecentMedia(
  accessToken: string,
  igUserId: string,
  limit = 25,
): Promise<InstagramMediaItem[]> {
  const params = new URLSearchParams({
    fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
    access_token: accessToken,
    limit: String(limit),
  });

  const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/media?${params.toString()}`);

  const data = (await res.json().catch(() => ({}))) as GraphApiErrorBody & {
    data?: InstagramMediaItem[];
  };

  if (!res.ok) {
    const message =
      data?.error?.message ?? `Graph API request failed with status ${res.status}`;
    throw new GraphApiError(message, res.status, data);
  }

  return data.data ?? [];
}
