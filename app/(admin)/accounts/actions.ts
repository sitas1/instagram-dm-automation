"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredStr(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalStr(formData: FormData, key: string) {
  const value = requiredStr(formData, key);
  return value === "" ? null : value;
}

function parseIgAccountInput(formData: FormData) {
  const igUserId = requiredStr(formData, "igUserId");
  const username = optionalStr(formData, "username");
  const accessTokenRaw = requiredStr(formData, "accessToken");
  const tokenExpiresAtRaw = requiredStr(formData, "tokenExpiresAt");

  if (igUserId.length < 1 || igUserId.length > 255) {
    throw new Error("IG User ID deve ter entre 1 e 255 caracteres.");
  }

  if (username && username.length > 255) {
    throw new Error("Username deve ter no máximo 255 caracteres.");
  }

  let tokenExpiresAt: Date | null = null;
  if (tokenExpiresAtRaw !== "") {
    tokenExpiresAt = new Date(tokenExpiresAtRaw);
    if (Number.isNaN(tokenExpiresAt.getTime())) {
      throw new Error("Data de expiração do token inválida.");
    }
  }

  return {
    igUserId,
    username,
    accessTokenRaw,
    tokenExpiresAt,
    active: formData.get("active") === "on",
  };
}

export async function createIgAccount(formData: FormData) {
  const input = parseIgAccountInput(formData);

  const db = getDb();
  await db.insert(igAccounts).values({
    igUserId: input.igUserId,
    username: input.username,
    accessToken: input.accessTokenRaw === "" ? null : input.accessTokenRaw,
    tokenExpiresAt: input.tokenExpiresAt,
    active: input.active,
  });

  revalidatePath("/accounts");
  revalidatePath("/automations");
  redirect("/accounts");
}

export async function updateIgAccount(id: string, formData: FormData) {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("ID de conta inválido.");
  }

  const input = parseIgAccountInput(formData);

  const db = getDb();
  const [updated] = await db
    .update(igAccounts)
    .set({
      igUserId: input.igUserId,
      username: input.username,
      // campo em branco no formulário mantém o token atual (nunca exibido de volta na UI)
      ...(input.accessTokenRaw !== ""
        ? { accessToken: input.accessTokenRaw }
        : {}),
      tokenExpiresAt: input.tokenExpiresAt,
      active: input.active,
      updatedAt: new Date(),
    })
    .where(eq(igAccounts.id, id))
    .returning({ id: igAccounts.id });

  if (!updated) {
    throw new Error("Conta não encontrada.");
  }

  revalidatePath("/accounts");
  revalidatePath("/automations");
  redirect("/accounts");
}
