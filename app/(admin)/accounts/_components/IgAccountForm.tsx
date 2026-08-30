import Link from "next/link";
import type { igAccounts } from "@/src/db/schema";
import { Field } from "../../_components/fields";

type IgAccount = typeof igAccounts.$inferSelect;

export function IgAccountForm({
  action,
  account,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  account?: IgAccount;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
      <Field
        label="Username"
        name="username"
        defaultValue={account?.username ?? ""}
        hint="Apenas para exibição no painel."
      />
      <Field
        label="IG User ID"
        name="igUserId"
        required
        defaultValue={account?.igUserId}
        hint="Instagram-scoped Business Account ID fornecido pela Meta."
      />
      <Field
        label="Access token"
        name="accessToken"
        type="password"
        defaultValue=""
        hint={
          account
            ? "Deixe em branco para manter o token atual. Preencha para substituí-lo."
            : "Token de longa duração da conta. Pode ser preenchido depois."
        }
      />
      <Field
        label="Token expira em"
        name="tokenExpiresAt"
        type="date"
        defaultValue={toDateInputValue(account?.tokenExpiresAt)}
        hint="Opcional."
      />
      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="active"
          defaultChecked={account?.active ?? true}
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
          href="/accounts"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}
