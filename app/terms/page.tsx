export const metadata = {
  title: "Termos de Serviço · 1Nort DM Automation",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-zinc-800">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-950">
        Termos de Serviço
      </h1>
      <p className="mb-8 text-zinc-500">Última atualização: 30 de agosto de 2026</p>

      <p className="mb-4">
        O <strong>1Nort DM Automation</strong> é uma ferramenta interna
        operada pela 1Nort Digital para automatizar respostas a comentários e
        mensagens diretas em contas de Instagram Business de clientes que
        autorizam expressamente essa integração através da API oficial da
        Meta.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Uso do serviço
      </h2>
      <p className="mb-4">
        O acesso ao painel administrativo é restrito à equipe da 1Nort
        Digital e a clientes autorizados. Cada conta do Instagram conectada
        deve pertencer a quem a conectou (ou a quem autorizou explicitamente
        a conexão) e ser uma conta profissional (Business ou Creator), como
        exigido pela Meta.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Responsabilidades
      </h2>
      <p className="mb-4">
        O administrador de cada conta é responsável pelo conteúdo das
        mensagens automáticas e respostas públicas configuradas, e por
        garantir que o uso da automação respeite as políticas da plataforma
        Instagram e a legislação aplicável.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Disponibilidade
      </h2>
      <p className="mb-4">
        O serviço é fornecido &quot;como está&quot;, sem garantia de
        disponibilidade contínua. A 1Nort Digital pode alterar, suspender ou
        descontinuar o serviço a qualquer momento.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Contato
      </h2>
      <p>
        Dúvidas sobre estes termos podem ser enviadas para{" "}
        <a href="mailto:admin@1nortdigital.com.br" className="underline">
          admin@1nortdigital.com.br
        </a>
        .
      </p>
    </div>
  );
}
