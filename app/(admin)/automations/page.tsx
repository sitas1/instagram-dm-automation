import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/src/db";
import { automations, igAccounts } from "@/src/db/schema";
import { toggleAutomationActive } from "./actions";

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
      accountUsername: igAccounts.username,
      accountIgUserId: igAccounts.igUserId,
    })
    .from(automations)
    .innerJoin(igAccounts, eq(automations.igAccountId, igAccounts.id))
    .orderBy(desc(automations.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Automations
        </h1>
        <Link
          href="/automations/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Nova automação
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhuma automação cadastrada ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Conta</th>
                <th className="px-4 py-3 font-medium">Palavra-chave</th>
                <th className="px-4 py-3 font-medium">Post alvo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((automation) => (
                <tr key={automation.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {automation.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {automation.accountUsername ?? automation.accountIgUserId}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {automation.keyword ?? (
                      <span className="italic text-zinc-400 dark:text-zinc-600">
                        qualquer comentário
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {automation.targetMediaCaption ? (
                      truncate(automation.targetMediaCaption, 40)
                    ) : automation.targetMediaId ? (
                      automation.targetMediaId
                    ) : (
                      <span className="italic text-zinc-400 dark:text-zinc-600">
                        qualquer post
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={toggleAutomationActive.bind(
                        null,
                        automation.id,
                        !automation.active,
                      )}
                    >
                      <button
                        type="submit"
                        className={
                          automation.active
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400"
                            : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }
                      >
                        {automation.active ? "Ativa" : "Inativa"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/automations/${automation.id}/edit`}
                      className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                    >
                      Editar
                    </Link>
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

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}
