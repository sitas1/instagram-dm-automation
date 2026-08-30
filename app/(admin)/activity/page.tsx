import { desc, eq } from "drizzle-orm";
import { getDb } from "@/src/db";
import {
  activityLog,
  automations,
  contacts,
  igAccounts,
} from "@/src/db/schema";
import { formatDateTime } from "../_lib/format";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Activity
        </h1>
        <form method="get" className="flex items-center gap-2">
          <label
            htmlFor="account"
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            Conta
          </label>
          <select
            id="account"
            name="account"
            defaultValue={account ?? ""}
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
          >
            <option value="">Todas as contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.username ?? acc.igUserId}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Filtrar
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum evento registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Automação</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Comentário</th>
                <th className="px-4 py-3 font-medium">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.accountUsername ?? row.accountIgUserId}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {row.eventType}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.automationName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.contactUsername ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.commentText ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.detail ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
