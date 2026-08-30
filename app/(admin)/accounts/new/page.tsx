import { PageHeader } from "../../_components/PageHeader";
import { IgAccountForm } from "../_components/IgAccountForm";
import { createIgAccount } from "../actions";

export default function NewIgAccountPage() {
  return (
    <div>
      <PageHeader title="Nova conta do Instagram" />
      <IgAccountForm action={createIgAccount} submitLabel="Criar conta" />
    </div>
  );
}
