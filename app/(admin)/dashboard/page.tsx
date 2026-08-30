import Link from "next/link";
import { Send, XCircle, Zap, UserPlus, Activity as ActivityIcon, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "../_components/PageHeader";
import { DataCard } from "../_components/DataCard";
import { EmptyState } from "../_components/EmptyState";
import { EventBadge } from "../_components/EventBadge";
import { StatusBadge } from "../_components/StatusBadge";
import { KpiCard } from "./_components/KpiCard";
import {
  getAccountsHealth,
  getDashboardKpis,
  getRecentActivity,
} from "../_lib/metrics";
import {
  formatPercent,
  formatRelativeTime,
  getTokenExpiryStatus,
} from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [kpis, recentActivity, accounts] = await Promise.all([
    getDashboardKpis(),
    getRecentActivity(10),
    getAccountsHealth(),
  ]);

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description="Resumo das automações de comentário e DM dos últimos 7 dias."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={Send}
          label="DMs enviadas (7d)"
          value={String(kpis.dmSent7d.value)}
          change={{
            current: kpis.dmSent7d.value,
            previous: kpis.dmSent7d.previous,
          }}
        />
        <KpiCard
          icon={XCircle}
          label="Taxa de falha (7d)"
          value={formatPercent(kpis.failureRate7d.value)}
          change={{
            current: kpis.failureRate7d.value,
            previous: kpis.failureRate7d.previous,
          }}
          invertColor
        />
        <KpiCard
          icon={Zap}
          label="Automações ativas"
          value={String(kpis.activeAutomations)}
        />
        <KpiCard
          icon={UserPlus}
          label="Contatos novos (7d)"
          value={String(kpis.newContacts7d.value)}
          change={{
            current: kpis.newContacts7d.value,
            previous: kpis.newContacts7d.previous,
          }}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <DataCard
          title="Atividade recente"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/activity">Ver tudo</Link>
            </Button>
          }
        >
          {recentActivity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="Nenhum evento ainda"
              description="Eventos aparecem aqui assim que uma automação processar um comentário."
            />
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <EventBadge
                      eventType={event.eventType}
                      detail={event.detail}
                    />
                    <span className="text-sm text-muted-foreground">
                      {event.accountUsername
                        ? `@${event.accountUsername}`
                        : event.accountIgUserId}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DataCard>

        <DataCard title="Contas">
          {accounts.length === 0 ? (
            <EmptyState
              icon={AtSign}
              title="Nenhuma conta cadastrada"
              className="py-10"
            />
          ) : (
            <div className="divide-y divide-border">
              {accounts.map((account) => {
                const expiry = getTokenExpiryStatus(account.tokenExpiresAt);
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-foreground">
                        {account.username
                          ? `@${account.username}`
                          : account.igUserId}
                      </span>
                      <StatusBadge
                        status={account.active ? "active" : "inactive"}
                      />
                    </div>
                    {!account.hasToken && account.active ? (
                      <StatusBadge status="no-token" />
                    ) : expiry === "expired" ? (
                      <StatusBadge status="token-expired" />
                    ) : expiry === "expiring-soon" ? (
                      <StatusBadge status="token-expiring" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </DataCard>
      </div>
    </div>
  );
}
