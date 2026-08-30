import { IgAccountForm } from "../_components/IgAccountForm";
import { createIgAccount } from "../actions";

export default function NewIgAccountPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Nova conta do Instagram
      </h1>
      <IgAccountForm action={createIgAccount} submitLabel="Criar conta" />
    </div>
  );
}
