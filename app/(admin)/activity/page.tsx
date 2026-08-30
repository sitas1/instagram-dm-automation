import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Activity as ActivityIcon } from "lucide-react";
import { getDb } from "@/src/db";
import {
  activityLog,
  automations,
  contacts,
  igAccounts,
} from "@/src/db/schema";
import { formatDateTime, formatRelativeTime } from "../_lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "../_components/PageHeader";
import { DataCard } from "../_components/DataCard";
import { EmptyState } from "../_components/EmptyState";
import { EventBadge } from "../_components/EventBadge";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ACTIVITY_LIMIT = 100;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ account?: string }>;
}) {
  const { account: rawAccount } = await searchParams;
  const account =
    rawAccount && UUID_PATTERN.test(rawAccount) ? rawAccount : undefined;
  const db = getDb();

  const accounts = await db
    .select({
      id: igAccounts.id,
      username: igAccounts.username,
      igUserId: igAccounts.igUserId,
    })
    .from(igAccounts)
    .orderBy(igAccounts.username);

  const rows = await db
    .select({
      id: activityLog.id,
      eventType: activityLog.eventType,
      commentText: activityLog.commentText,
      detail: activityLog.detail,
      createdAt: activityLog.createdAt,
      automationId: automations.id,
      automationName: automations.name,
      contactUsername: contacts.igUsername,
      accountUsername: igAccounts.username,
      accountIgUserId: igAccounts.igUserId,
    })
    .from(activityLog)
    .innerJoin(igAccounts, eq(activityLog.igAccountId, igAccounts.id))
    .leftJoin(automations, eq(activityLog.automationId, automations.id))
    .leftJoin(contacts, eq(activityLog.contactId, contacts.id))
    .where(account ? eq(activityLog.igAccountId, account) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(ACTIVITY_LIMIT);

  return (
    <div>
      <PageHeader
        title="Atividade"
        description="Histórico de comentários processados, DMs enviadas e falhas."
      />

      <DataCard>
        <form
          method="get"
          className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-4"
        >
          <Select name="account" defaultValue={account ?? "all"}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.username ?? acc.igUserId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          {account && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/activity">Limpar</Link>
            </Button>
          )}
        </form>

        {rows.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title={
              account ? "Nenhum evento para esta conta" : "Nenhum evento ainda"
            }
            description={
              account
                ? "Tente limpar o filtro ou selecione outra conta."
                : "Eventos aparecem aqui assim que uma automação processar um comentário."
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Automação</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Comentário</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{formatRelativeTime(row.createdAt)}</span>
                        <span className="text-xs text-muted-foreground/70">
                          {formatDateTime(row.createdAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.accountUsername
                        ? `@${row.accountUsername}`
                        : row.accountIgUserId}
                    </TableCell>
                    <TableCell>
                      <EventBadge eventType={row.eventType} detail={row.detail} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.automationId && row.automationName ? (
                        <Link
                          href={`/automations/${row.automationId}/edit`}
                          className="rounded-sm text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {row.automationName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.contactUsername ? `@${row.contactUsername}` : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.commentText ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">
                              {row.commentText}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{row.commentText}</TooltipContent>
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {row.detail ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block truncate">
                              {row.detail}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{row.detail}</TooltipContent>
                        </Tooltip>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Últimos {Math.min(rows.length, ACTIVITY_LIMIT)} eventos.
            </div>
          </>
        )}
      </DataCard>
    </div>
  );
}
