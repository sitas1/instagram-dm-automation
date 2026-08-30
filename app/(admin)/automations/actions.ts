"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/src/db";
import { automations } from "@/src/db/schema";

export type AutomationActionState = { error?: string };

const MEDIA_ID_PATTERN = /^\d+$/;
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

function parseAutomationInput(formData: FormData) {
  const igAccountId = requiredStr(formData, "igAccountId");
  const name = requiredStr(formData, "name");
  const dmMessage = requiredStr(formData, "dmMessage");
  const targetMediaId = optionalStr(formData, "targetMediaId");
  const targetMediaCaption = optionalStr(formData, "targetMediaCaption");
  const keyword = optionalStr(formData, "keyword");
  const publicReplyMessage = optionalStr(formData, "publicReplyMessage");

  if (!UUID_PATTERN.test(igAccountId)) {
    throw new Error("Selecione uma conta do Instagram válida.");
  }

  if (name.length < 1 || name.length > 255) {
    throw new Error("Nome deve ter entre 1 e 255 caracteres.");
  }

  if (dmMessage.length < 1 || dmMessage.length > 4096) {
    throw new Error("Mensagem de DM deve ter entre 1 e 4096 caracteres.");
  }

  if (publicReplyMessage && publicReplyMessage.length > 4096) {
    throw new Error(
      "Resposta pública no comentário deve ter no máximo 4096 caracteres.",
    );
  }

  if (keyword && keyword.length > 512) {
    throw new Error("Palavra-chave deve ter no máximo 512 caracteres.");
  }

  if (targetMediaId && !MEDIA_ID_PATTERN.test(targetMediaId)) {
    throw new Error("Media ID deve conter apenas números.");
  }

  const cooldownMinutesRaw = requiredStr(formData, "cooldownMinutes");
  const cooldownMinutes = Number(cooldownMinutesRaw);

  if (
    cooldownMinutesRaw === "" ||
    !Number.isInteger(cooldownMinutes) ||
    cooldownMinutes < 0
  ) {
    throw new Error(
      "Cooldown deve ser um número inteiro maior ou igual a 0.",
    );
  }

  return {
    igAccountId,
    name,
    dmMessage,
    targetMediaId,
    targetMediaCaption,
    keyword,
    publicReplyMessage,
    cooldownMinutes,
    oncePerContact: formData.get("oncePerContact") === "on",
    active: formData.get("active") === "on",
  };
}

export async function createAutomation(
  _prevState: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  let input: ReturnType<typeof parseAutomationInput>;
  try {
    input = parseAutomationInput(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Dados inválidos." };
  }

  const db = getDb();
  await db.insert(automations).values(input);

  revalidatePath("/automations");
  redirect("/automations");
}

export async function updateAutomation(
  id: string,
  _prevState: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  if (!UUID_PATTERN.test(id)) {
    return { error: "ID de automação inválido." };
  }

  let input: ReturnType<typeof parseAutomationInput>;
  try {
    input = parseAutomationInput(formData);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Dados inválidos." };
  }

  const db = getDb();

  const [existing] = await db
    .select({ igAccountId: automations.igAccountId })
    .from(automations)
    .where(eq(automations.id, id))
    .limit(1);

  if (!existing) {
    return { error: "Automação não encontrada." };
  }

  if (existing.igAccountId !== input.igAccountId) {
    return { error: "Não é possível trocar a conta de uma automação existente." };
  }

  await db
    .update(automations)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath("/automations");
  redirect("/automations");
}

export async function toggleAutomationActive(id: string, nextActive: boolean) {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("ID de automação inválido.");
  }

  const db = getDb();
  await db
    .update(automations)
    .set({ active: nextActive, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath("/automations");
}
