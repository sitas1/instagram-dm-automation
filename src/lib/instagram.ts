const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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

async function graphApiPost(path: string, params: Record<string, string>) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_PAGE_ACCESS_TOKEN nao esta configurado");
  }

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
// Endpoint da Instagram Platform API (Instagram Login): POST /{ig-business-account-id}/messages
// com recipient.comment_id -- nao confundir com /{comment-id}/private_replies (Messenger Platform
// legado, nao aplicavel aqui) nem com /{comment-id}/replies (resposta publica, ver postPublicReply).
export function sendPrivateReply(commentId: string, message: string) {
  const igBusinessAccountId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!igBusinessAccountId) {
    throw new Error("IG_BUSINESS_ACCOUNT_ID nao esta configurado");
  }

  return graphApiPost(`${igBusinessAccountId}/messages`, {
    recipient: JSON.stringify({ comment_id: commentId }),
    message: JSON.stringify({ text: message }),
  });
}

// Resposta publica visivel no proprio comentario.
export function postPublicReply(commentId: string, message: string) {
  return graphApiPost(`${commentId}/replies`, { message });
}
