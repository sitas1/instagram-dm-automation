import { AutomationForm } from "../_components/AutomationForm";
import { createAutomation } from "../actions";

export default function NewAutomationPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Nova automação
      </h1>
      <AutomationForm action={createAutomation} submitLabel="Criar automação" />
    </div>
  );
}
