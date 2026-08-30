import { getDb } from "@/src/db";
import { igAccounts } from "@/src/db/schema";
import { PageHeader } from "../../_components/PageHeader";
import { AutomationForm } from "../_components/AutomationForm";
import { createAutomation } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAutomationPage() {
  const db = getDb();
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
      <PageHeader title="Nova automação" />
      <AutomationForm
        action={createAutomation}
        accounts={accounts}
        submitLabel="Criar automação"
      />
    </div>
  );
}
