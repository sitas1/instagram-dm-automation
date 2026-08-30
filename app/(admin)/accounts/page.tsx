import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { AtSign, Plus, Pencil } from "lucide-react";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
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
import { StatusBadge } from "../_components/StatusBadge";
import { EmptyState } from "../_components/EmptyState";
import { formatDateTime, getTokenExpiryStatus } from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const db = getDb();
  // Projeção explícita: nunca selecionar access_token, só um booleano derivado.
  const rows = await db
    .select({
      id: igAccounts.id,
      igUserId: igAccounts.igUserId,
      username: igAccounts.username,
      active: igAccounts.active,
      tokenExpiresAt: igAccounts.tokenExpiresAt,
      hasToken: sql<boolean>`${igAccounts.accessToken} is not null`,
    })
    .from(igAccounts)
    .orderBy(desc(igAccounts.createdAt));

  return (
    <div>
      <PageHeader
        title="Contas do Instagram"
        description="Contas conectadas que recebem comentários e enviam DMs automaticamente."
        action={
          <Button asChild size="sm">
            <Link href="/accounts/new">
              <Plus className="size-4" />
              Nova conta
            </Link>
          </Button>
        }
      />

      <DataCard>
        {rows.length === 0 ? (
          <EmptyState
            icon={AtSign}
            title="Nenhuma conta cadastrada"
            description="Conecte uma conta do Instagram para começar a automatizar respostas."
            action={
              <Button asChild size="sm">
                <Link href="/accounts/new">
                  <Plus className="size-4" />
                  Nova conta
                </Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>IG User ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => {
                const expiryStatus = getTokenExpiryStatus(
                  account.tokenExpiresAt
                );

                return (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium text-foreground">
                      {account.username ? (
                        `@${account.username}`
                      ) : (
                        <span className="italic text-muted-foreground">
                          sem username
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {account.igUserId}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={account.active ? "active" : "inactive"}
                      />
                    </TableCell>
                    <TableCell>
                      {!account.hasToken && account.active ? (
                        <StatusBadge status="no-token" />
                      ) : expiryStatus === "expired" ? (
                        <StatusBadge status="token-expired" />
                      ) : expiryStatus === "expiring-soon" ? (
                        <StatusBadge status="token-expiring" />
                      ) : account.tokenExpiresAt ? (
                        <span className="text-muted-foreground">
                          {formatDateTime(account.tokenExpiresAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/accounts/${account.id}/edit`}>
                          <Pencil className="size-3.5" />
                          Editar
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
