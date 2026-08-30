"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { DataCard } from "../../_components/DataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { IgAccountActionState } from "../actions";

type IgAccountFormValues = {
  igUserId: string;
  username: string | null;
  active: boolean;
  tokenExpiresAt: Date | null;
  hasToken: boolean;
};

export function IgAccountForm({
  action,
  account,
  submitLabel,
}: {
  action: (
    prevState: IgAccountActionState,
    formData: FormData,
  ) => Promise<IgAccountActionState>;
  account?: IgAccountFormValues;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-xl">
      <DataCard>
        <div className="flex flex-col gap-5 p-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              defaultValue={account?.username ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Apenas para exibição no painel.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="igUserId">IG User ID</Label>
            <Input
              id="igUserId"
              name="igUserId"
              required
              defaultValue={account?.igUserId}
            />
            <p className="text-xs text-muted-foreground">
              Instagram-scoped Business Account ID fornecido pela Meta.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accessToken">Access token</Label>
            <Input
              id="accessToken"
              name="accessToken"
              type="password"
              defaultValue=""
            />
            <p className="text-xs text-muted-foreground">
              {account
                ? account.hasToken
                  ? "Deixe em branco para manter o token atual. Preencha para substituí-lo."
                  : "Esta conta ainda não tem um token salvo. Preencha para adicionar um."
                : "Token de longa duração da conta. Pode ser preenchido depois."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tokenExpiresAt">Token expira em</Label>
            <Input
              id="tokenExpiresAt"
              name="tokenExpiresAt"
              type="date"
              defaultValue={toDateInputValue(account?.tokenExpiresAt)}
            />
            <p className="text-xs text-muted-foreground">Opcional.</p>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              name="active"
              defaultChecked={account?.active ?? true}
              className="size-4 rounded border-input accent-primary"
            />
            Ativa
          </label>

          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : submitLabel}
            </Button>
            <Button asChild variant="outline">
              <Link href="/accounts">Cancelar</Link>
            </Button>
          </div>
        </div>
      </DataCard>
    </form>
  );
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}
