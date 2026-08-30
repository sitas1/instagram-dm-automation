import { desc } from "drizzle-orm";
import { getDb } from "@/src/db";
import { contacts } from "@/src/db/schema";
import { formatDateTime } from "../_lib/format";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const db = getDb();
  const rows = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.firstSeenAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Contacts
      </h1>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum contato registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">IG User ID</th>
                <th className="px-4 py-3 font-medium">Primeiro contato</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50">
                    {contact.igUsername ?? (
                      <span className="italic text-zinc-400 dark:text-zinc-600">
                        sem username
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {contact.igUserId}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(contact.firstSeenAt)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(contact.lastContactedAt)}
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
