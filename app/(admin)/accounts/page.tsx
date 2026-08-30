import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
import { formatDateTime, getTokenExpiryStatus } from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const db = getDb();
  const rows = await db
    .select()
    .from(igAccounts)
    .orderBy(desc(igAccounts.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Contas do Instagram
        </h1>
        <Link
          href="/accounts/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Nova conta
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhuma conta cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">IG User ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Token expira em</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((account) => {
                const expiryStatus = getTokenExpiryStatus(
                  account.tokenExpiresAt,
                );
                return (
                  <tr key={account.id}>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                      {account.username ?? (
                        <span className="italic text-zinc-400 dark:text-zinc-600">
                          sem username
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {account.igUserId}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          account.active
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {account.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {expiryStatus === "none" ? (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          —
                        </span>
                      ) : (
                        <span
                          className={
                            expiryStatus === "expired"
                              ? "font-medium text-red-600 dark:text-red-400"
                              : expiryStatus === "expiring-soon"
                                ? "font-medium text-amber-600 dark:text-amber-400"
                                : "text-zinc-600 dark:text-zinc-400"
                          }
                        >
                          {formatDateTime(account.tokenExpiresAt)}
                          {expiryStatus === "expired" && " (expirado)"}
                          {expiryStatus === "expiring-soon" &&
                            " (expira em breve)"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/accounts/${account.id}/edit`}
                        className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
