import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/automations/:path*",
    "/contacts/:path*",
    "/activity/:path*",
    "/accounts/:path*",
  ],
};

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Comparação em tempo constante — evita vazar informação da senha via timing attack
// (não usa crypto.timingSafeEqual do Node porque este arquivo roda em runtime edge-compatível).
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Autenticacao necessaria", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
  });
}

// Protege o painel admin (grupo de rotas (admin)) com Basic Auth de senha unica.
// Decisao consciente de nao implementar sistema de usuarios/sessao: uso interno
// de agencia, um unico admin.
export async function proxy(request: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return unauthorized();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  let providedPassword: string;
  try {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    providedPassword = separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);
  } catch {
    return unauthorized();
  }

  const [expectedHash, providedHash] = await Promise.all([
    sha256Hex(adminPassword),
    sha256Hex(providedPassword),
  ]);

  if (!timingSafeEqualHex(expectedHash, providedHash)) {
    return unauthorized();
  }

  return NextResponse.next();
}
