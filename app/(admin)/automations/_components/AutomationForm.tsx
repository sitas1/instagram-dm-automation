import Link from "next/link";
import type { automations } from "@/src/db/schema";

type Automation = typeof automations.$inferSelect;

export function AutomationForm({
  action,
  automation,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  automation?: Automation;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-5">
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

function Field({
  label,
  name,
  defaultValue,
  required,
  hint,
  type = "text",
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  hint?: string;
  type?: "text" | "number";
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        min={min}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {hint && (
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={3}
        className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
    </label>
  );
}
