"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle, TriangleAlert } from "lucide-react";
import { automations } from "@/src/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DataCard } from "../../_components/DataCard";
import type { AutomationActionState } from "../actions";

type Automation = typeof automations.$inferSelect;
type AccountOption = { id: string; username: string | null; igUserId: string };

function FormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export function AutomationForm({
  action,
  automation,
  accounts,
  submitLabel,
}: {
  action: (
    prevState: AutomationActionState,
    formData: FormData,
  ) => Promise<AutomationActionState>;
  automation?: Automation;
  accounts: AccountOption[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-xl">
      <DataCard>
        <div className="flex flex-col gap-6 p-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={automation?.name}
            />
          </div>

          <Separator />

          <FormSection label="Gatilho">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="igAccountId">Conta do Instagram</Label>
              {/* select nativo de propósito: precisa funcionar sem JavaScript no submit do form */}
              <select
                id="igAccountId"
                name="igAccountId"
                required
                defaultValue={automation?.igAccountId ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Selecione uma conta
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username ?? account.igUserId}
                  </option>
                ))}
              </select>
            </div>

            {accounts.length === 0 && (
              <Alert>
                <TriangleAlert />
                <AlertDescription>
                  Nenhuma conta do Instagram cadastrada.{" "}
                  <Link href="/accounts/new">Crie uma conta</Link> antes de
                  criar uma automação.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetMediaId">
                ID da mídia alvo (post/reel)
              </Label>
              <Input
                id="targetMediaId"
                name="targetMediaId"
                defaultValue={automation?.targetMediaId ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para aplicar a qualquer post/reel da conta.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetMediaCaption">Legenda da mídia alvo</Label>
              <Textarea
                id="targetMediaCaption"
                name="targetMediaCaption"
                defaultValue={automation?.targetMediaCaption ?? ""}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input
                id="keyword"
                name="keyword"
                defaultValue={automation?.keyword ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para responder a qualquer comentário.
              </p>
            </div>
          </FormSection>

          <Separator />

          <FormSection label="Mensagens">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dmMessage">Mensagem de DM</Label>
              <Textarea
                id="dmMessage"
                name="dmMessage"
                required
                defaultValue={automation?.dmMessage}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="publicReplyMessage">
                Resposta pública no comentário
              </Label>
              <Textarea
                id="publicReplyMessage"
                name="publicReplyMessage"
                defaultValue={automation?.publicReplyMessage ?? ""}
              />
            </div>
          </FormSection>

          <Separator />

          <FormSection label="Limites">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cooldownMinutes">
                Cooldown entre DMs pro mesmo contato (minutos)
              </Label>
              <Input
                id="cooldownMinutes"
                name="cooldownMinutes"
                type="number"
                min={0}
                defaultValue={String(automation?.cooldownMinutes ?? 1440)}
              />
              <p className="text-xs text-muted-foreground">
                0 = sem limite (o contato pode receber DM desta automação
                novamente a qualquer momento).
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="oncePerContact"
                defaultChecked={automation?.oncePerContact ?? false}
                className="size-4 rounded border-input accent-primary"
              />
              Enviar DM apenas uma vez por contato, ignorando o cooldown
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="active"
                defaultChecked={automation?.active ?? true}
                className="size-4 rounded border-input accent-primary"
              />
              Ativa
            </label>
          </FormSection>

          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : submitLabel}
            </Button>
            <Button asChild variant="outline">
              <Link href="/automations">Cancelar</Link>
            </Button>
          </div>
        </div>
      </DataCard>
    </form>
  );
}
