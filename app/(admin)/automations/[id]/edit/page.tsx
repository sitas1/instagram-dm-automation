import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/src/db";
import { automations, igAccounts } from "@/src/db/schema";
import { PageHeader } from "../../../_components/PageHeader";
import { AutomationForm } from "../../_components/AutomationForm";
import { updateAutomation } from "../../actions";

export default async function EditAutomationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getDb();
  const [automation] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, id))
    .limit(1);

  if (!automation) {
    notFound();
  }

  const accounts = await db
    .select({
      id: igAccounts.id,
      username: igAccounts.username,
      igUserId: igAccounts.igUserId,
    })
    .from(igAccounts)
    .orderBy(igAccounts.username);

  return (
    <div>
      <PageHeader title="Editar automação" />
      <AutomationForm
        action={updateAutomation.bind(null, automation.id)}
        automation={automation}
        accounts={accounts}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
