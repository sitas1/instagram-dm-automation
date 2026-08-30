import Link from "next/link";
import { getDb } from "@/src/db";
import { automations, igAccounts } from "@/src/db/schema";
import { Field, SelectField, TextAreaField } from "../../_components/fields";

type Automation = typeof automations.$inferSelect;

export async function AutomationForm({
  action,
  automation,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  automation?: Automation;
  submitLabel: string;
}) {
  const db = getDb();
  const accounts = await db
    .select({
      id: igAccounts.id,
      username: igAccounts.username,
      igUserId: igAccounts.igUserId,
    })
    .from(igAccounts)
    .orderBy(igAccounts.username);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <SelectField
        label="Conta do Instagram"
        name="igAccountId"
        required
        defaultValue={automation?.igAccountId}
      >
        <option value="" disabled>
          Selecione uma conta
        </option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.username ?? account.igUserId}
          </option>
        ))}
      </SelectField>
      {accounts.length === 0 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Nenhuma conta do Instagram cadastrada.{" "}
          <Link href="/accounts/new" className="underline">
            Crie uma conta
          </Link>{" "}
          antes de criar uma automação.
        </p>
      )}
      <Field
        label="Nome"
        name="name"
        required
        defaultValue={automation?.name}
      />
      <Field
        label="ID da mídia alvo (post/reel)"
        name="targetMediaId"
        defaultValue={automation?.targetMediaId ?? ""}
        hint="Deixe em branco para aplicar a qualquer post/reel da conta."
      />
      <TextAreaField
        label="Legenda da mídia alvo"
        name="targetMediaCaption"
        defaultValue={automation?.targetMediaCaption ?? ""}
      />
      <Field
        label="Palavra-chave"
        name="keyword"
        defaultValue={automation?.keyword ?? ""}
        hint="Deixe em branco para responder a qualquer comentário."
      />
      <TextAreaField
        label="Mensagem de DM"
        name="dmMessage"
        required
        defaultValue={automation?.dmMessage}
      />
      <TextAreaField
        label="Resposta pública no comentário"
        name="publicReplyMessage"
        defaultValue={automation?.publicReplyMessage ?? ""}
      />
      <Field
        label="Cooldown entre DMs pro mesmo contato (minutos)"
        name="cooldownMinutes"
        type="number"
        min={0}
        defaultValue={String(automation?.cooldownMinutes ?? 1440)}
        hint="0 = sem limite (o contato pode receber DM desta automação novamente a qualquer momento)."
      />
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="oncePerContact"
          defaultChecked={automation?.oncePerContact ?? false}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Enviar DM apenas uma vez por contato, ignorando o cooldown
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked={automation?.active ?? true}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Ativa
      </label>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitLabel}
        </button>
        <Link
          href="/automations"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
