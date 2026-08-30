import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
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
    .select()
    .from(igAccounts)
    .where(eq(igAccounts.id, id))
    .limit(1);

  if (!account) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Editar conta do Instagram
      </h1>
      <IgAccountForm
        action={updateIgAccount.bind(null, account.id)}
        account={account}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
