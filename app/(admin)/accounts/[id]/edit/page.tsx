import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
import { PageHeader } from "../../../_components/PageHeader";
import { IgAccountForm } from "../../_components/IgAccountForm";
import { updateIgAccount } from "../../actions";

export default async function EditIgAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const [account] = await db
    .select({
      igUserId: igAccounts.igUserId,
      username: igAccounts.username,
      active: igAccounts.active,
      tokenExpiresAt: igAccounts.tokenExpiresAt,
      hasToken: sql<boolean>`${igAccounts.accessToken} is not null`,
    })
    .from(igAccounts)
    .where(eq(igAccounts.id, id))
    .limit(1);

  if (!account) {
    notFound();
  }

  return (
    <div>
      <PageHeader title="Editar conta do Instagram" />
      <IgAccountForm
        action={updateIgAccount.bind(null, id)}
        account={account}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
