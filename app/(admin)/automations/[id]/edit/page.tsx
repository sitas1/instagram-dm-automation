import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/src/db";
import { automations } from "@/src/db/schema";
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

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Editar automação
      </h1>
      <AutomationForm
        action={updateAutomation.bind(null, automation.id)}
        automation={automation}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
