export const metadata = {
  title: "Exclusão de Dados · 1Nort DM Automation",
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-zinc-800">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-950">
        Instruções de Exclusão de Dados
      </h1>
      <p className="mb-8 text-zinc-500">Última atualização: 30 de agosto de 2026</p>

      <p className="mb-4">
        Para solicitar a exclusão de todos os dados armazenados pelo{" "}
        <strong>1Nort DM Automation</strong> referentes à sua conta do
        Instagram, envie um e-mail para{" "}
        <a href="mailto:admin@1nortdigital.com.br" className="underline">
          admin@1nortdigital.com.br
        </a>{" "}
        informando o @usuário da conta do Instagram conectada.
      </p>

      <p className="mb-4">
        Após a solicitação, removeremos em até 7 dias úteis: o token de
        acesso armazenado, o cadastro da conta, suas automações, o histórico
        de contatos que interagiram com essa conta e o log de atividade
        associado.
      </p>

      <p>
        Você também pode revogar o acesso do aplicativo diretamente pelo
        Instagram, em Configurações → Aplicativos e sites, a qualquer
        momento — isso invalida o token de acesso imediatamente, mesmo antes
        da exclusão dos registros no nosso banco de dados.
      </p>
    </div>
  );
}
