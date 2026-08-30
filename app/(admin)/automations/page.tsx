import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Zap, Plus, Pencil } from "lucide-react";
import { getDb } from "@/src/db";
import { automations, igAccounts } from "@/src/db/schema";
import { toggleAutomationActive } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "../_components/PageHeader";
import { DataCard } from "../_components/DataCard";
import { EmptyState } from "../_components/EmptyState";
import { cn } from "@/lib/utils";
import { formatCooldown } from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: automations.id,
      name: automations.name,
      keyword: automations.keyword,
      targetMediaId: automations.targetMediaId,
      targetMediaCaption: automations.targetMediaCaption,
      active: automations.active,
      cooldownMinutes: automations.cooldownMinutes,
      oncePerContact: automations.oncePerContact,
      accountUsername: igAccounts.username,
      accountIgUserId: igAccounts.igUserId,
    })
    .from(automations)
    .innerJoin(igAccounts, eq(automations.igAccountId, igAccounts.id))
    .orderBy(desc(automations.createdAt));

  return (
    <div>
      <PageHeader
        title="Automações"
        description="Regras que transformam comentários em DMs automáticas."
        action={
          <Button asChild size="sm">
            <Link href="/automations/new">
              <Plus className="size-4" />
              Nova automação
            </Link>
          </Button>
        }
      />

      <DataCard>
        {rows.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Nenhuma automação cadastrada"
            description="Crie uma automação para responder comentários automaticamente."
            action={
              <Button asChild size="sm">
                <Link href="/automations/new">
                  <Plus className="size-4" />
                  Nova automação
                </Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((automation) => (
                <TableRow key={automation.id}>
                  <TableCell className="font-medium text-foreground">
                    {automation.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {automation.accountUsername
                      ? `@${automation.accountUsername}`
                      : automation.accountIgUserId}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span>
                        {automation.keyword ?? (
                          <span className="italic text-muted-foreground/70">
                            qualquer comentário
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        {automation.targetMediaCaption
                          ? truncate(automation.targetMediaCaption, 40)
                          : automation.targetMediaId
                            ? automation.targetMediaId
                            : "qualquer post"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs">
                        {formatCooldown(automation.cooldownMinutes)}
                      </span>
                      {automation.oncePerContact && (
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          1× por contato
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <form
                      action={toggleAutomationActive.bind(
                        null,
                        automation.id,
                        !automation.active
                      )}
                    >
                      <button
                        type="submit"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          automation.active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            automation.active
                              ? "bg-emerald-500"
                              : "bg-slate-400"
                          )}
                        />
                        {automation.active ? "Ativa" : "Pausada"}
                      </button>
                    </form>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/automations/${automation.id}/edit`}>
                        <Pencil className="size-3.5" />
                        Editar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}
