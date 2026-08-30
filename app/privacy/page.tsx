export const metadata = {
  title: "Política de Privacidade · 1Nort DM Automation",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16 text-sm leading-relaxed text-zinc-800">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-950">
        Política de Privacidade
      </h1>
      <p className="mb-8 text-zinc-500">Última atualização: 30 de agosto de 2026</p>

      <p className="mb-4">
        Este documento descreve como o <strong>1Nort DM Automation</strong>{" "}
        (&quot;o sistema&quot;) coleta, usa e armazena dados ao se conectar à
        API do Instagram para automatizar respostas a comentários e mensagens
        diretas. O sistema é operado pela 1Nort Digital como ferramenta
        interna de automação para contas de Instagram Business de clientes
        que autorizam expressamente essa integração.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Dados que coletamos
      </h2>
      <ul className="mb-4 list-disc space-y-1 pl-5">
        <li>
          Identificador e nome de usuário da conta do Instagram Business
          conectada (ig_user_id, username).
        </li>
        <li>
          O token de acesso de longa duração emitido pela Meta para essa
          conta, usado exclusivamente para chamar a API do Instagram em nome
          dela.
        </li>
        <li>
          Conteúdo de comentários recebidos em publicações da conta conectada
          (texto do comentário, identificador do comentário e da publicação).
        </li>
        <li>
          Identificador e nome de usuário de quem comenta, apenas para
          controlar o histórico de contato e evitar mensagens duplicadas.
        </li>
        <li>
          Registro das mensagens automáticas enviadas e das respostas
          públicas publicadas pelo sistema.
        </li>
      </ul>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Como usamos esses dados
      </h2>
      <p className="mb-4">
        Os dados são usados exclusivamente para operar a automação
        configurada pelo administrador da conta: identificar comentários que
        correspondem a uma regra configurada e, quando aplicável, enviar uma
        mensagem direta automática e/ou publicar uma resposta pública ao
        comentário, ambas definidas previamente pelo administrador.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Compartilhamento de dados
      </h2>
      <p className="mb-4">
        Não vendemos nem compartilhamos esses dados com terceiros. Os dados
        trafegam apenas entre o sistema, o banco de dados que o suporta e a
        API oficial da Meta/Instagram, na medida necessária para operar a
        automação.
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Retenção e exclusão
      </h2>
      <p className="mb-4">
        Os dados são mantidos enquanto a conta permanecer conectada ao
        sistema. Para solicitar a exclusão dos dados de uma conta, veja
        nossas{" "}
        <a href="/data-deletion" className="underline">
          instruções de exclusão de dados
        </a>
        .
      </p>

      <h2 className="mb-2 mt-8 text-lg font-semibold text-zinc-950">
        Contato
      </h2>
      <p>
        Dúvidas sobre esta política podem ser enviadas para{" "}
        <a href="mailto:admin@1nortdigital.com.br" className="underline">
          admin@1nortdigital.com.br
        </a>
        .
      </p>
    </div>
  );
}
