import { desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { getDb } from "@/src/db";
import { contacts, igAccounts } from "@/src/db/schema";
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
import { formatDateTime } from "../_lib/format";

export const dynamic = "force-dynamic";

const CONTACTS_LIMIT = 200;

export default async function ContactsPage() {
  const db = getDb();
  const rows = await db
    .select({
      id: contacts.id,
      igUserId: contacts.igUserId,
      igUsername: contacts.igUsername,
      firstSeenAt: contacts.firstSeenAt,
      lastContactedAt: contacts.lastContactedAt,
      accountUsername: igAccounts.username,
      accountIgUserId: igAccounts.igUserId,
    })
    .from(contacts)
    .innerJoin(igAccounts, eq(contacts.igAccountId, igAccounts.id))
    .orderBy(desc(contacts.firstSeenAt))
    .limit(CONTACTS_LIMIT);

  return (
    <div>
      <PageHeader
        title="Contatos"
        description="Pessoas que já comentaram em posts monitorados pelas automações."
      />

      <DataCard>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum contato registrado"
            description="Contatos aparecem aqui assim que uma automação processar o primeiro comentário."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>IG User ID</TableHead>
                  <TableHead>Primeiro contato</TableHead>
                  <TableHead>Último contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                          {(contact.igUsername ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <span className="font-medium text-foreground">
                          {contact.igUsername ? (
                            `@${contact.igUsername}`
                          ) : (
                            <span className="italic text-muted-foreground">
                              sem username
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.accountUsername
                        ? `@${contact.accountUsername}`
                        : contact.accountIgUserId}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {contact.igUserId}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(contact.firstSeenAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.lastContactedAt ? (
                        formatDateTime(contact.lastContactedAt)
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Nunca contatado
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
              Mostrando os {Math.min(rows.length, CONTACTS_LIMIT)} contatos
              mais recentes.
            </div>
          </>
        )}
      </DataCard>
    </div>
  );
}
