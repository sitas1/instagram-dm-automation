# REVISÃO DE CÓDIGO — TERCEIRA VALIDAÇÃO (MÚLTIPLAS CONTAS)
## Validador (Crivo) — Análise de Segurança do Access Token e Isolamento de Contas

**Data:** 2026-08-29  
**Revisor:** Validador (Crivo)  
**Escopo:** Segurança do access token (novo campo sensível), isolamento entre contas, exposição de secrets  
**Status:** Revisão finalizada com 3 issues encontradas

---

## ANÁLISE DOS 5 FOCOS ESPECIAIS

### 1. ✅ Access Token em texto plano no Postgres
**Severidade:** 🟡 BAIXO (aceitável para contexto)  
**Arquivo:** `src/db/schema.ts:22`

```ts
accessToken: text("access_token"),
```

**Constatação:**
- ✅ Armazenado em texto plano, conforme esperado
- ✅ Não aparece em nenhum log do sistema (verificado instagram.ts, webhook)
- ✅ Não é reenviado ao formulário (sempre `defaultValue=""`)
- ✅ Acesso restrito via Basic Auth no proxy (exceto /accounts — ver issue #2)
- ✅ Contexto de uso: apenas para admin interno manipular, não para usuários finais

**Risco Mitigado:**
- Se alguém tiver acesso ao banco, pode ler token bruto
- Se houver exfiltração de erro via Graph API, token pode vazar (ver issue #4)
- Acesso a logs de servidor (stderr/stdout) pode revelar token em traces

**Status:** ✅ ACEITÁVEL para uso interno + admin password protegido

---

### 2. ⚠️ Formulário de criar/editar conta — Token escondido corretamente
**Severidade:** 🟢 BOM (implementação correta)  
**Arquivo:** `app/(admin)/accounts/_components/IgAccountForm.tsx:34-40`

```ts
<Field
  label="Access token"
  name="accessToken"
  type="password"
  defaultValue=""
  hint={
    account
      ? "Deixe em branco para manter o token atual. Preencha para substituí-lo."
      : "Token de longa duração da conta. Pode ser preenchido depois."
  }
/>
```

**Constatação:**
- ✅ Campo de tipo `password` (não exibe caracteres) ✓
- ✅ `defaultValue=""` — NUNCA reenvia token atual ao formulário ✓
- ✅ Hint explica que deixar vazio mantém token ✓
- ✅ Server action responde corretamente (actions.ts:84-86):
  ```ts
  ...(input.accessTokenRaw !== ""
    ? { accessToken: input.accessTokenRaw }
    : {}),
  ```
  Se campo vazio, não atualiza o campo, mantém valor anterior ✓

**Detalhe de Segurança:**
- Página de edição (page.tsx:32) passa objeto `account` completo (com token) para formulário
- Porém formulário ignora `account.accessToken` completamente
- ✅ Seguro, mas seria melhor não passar o token ao formulário (filtrar antes de passar)

**Status:** ✅ APROVADO — Token não é exposto na UI

---

### 3. ⚠️ Erros de Graph API — Risco de vazar token
**Severidade:** 🟠 MÉDIO (mitigado, mas potencial)  
**Arquivo:** `src/lib/instagram.ts:26-47` + webhook (linhas 310, 342)

**Análise de Fluxo:**

**Cenário 1: Token inválido/expirado**
```ts
// instagram.ts:42-44
const message = data?.error?.message ?? `Graph API request failed with status ${res.status}`;
throw new GraphApiError(message, res.status, data);
```

**Constatação:**
- ✅ Extrai apenas `data?.error?.message` da resposta Meta
- ✅ Meta não retorna o token em mensagens de erro
- ✅ URL do fetch (line 33) não inclui token em URL (está em body URLSearchParams)

**Cenário 2: Salvo em activityLog.metadata**
```ts
// webhook.ts:311, 343
metadata: error instanceof GraphApiError ? error.body : undefined,
```

**Constatação:**
- `error.body` = resposta JSON da Meta
- Meta retorna campos como `error.message`, `error.type`, `error.code`, `fbtrace_id`
- ✅ Token **não aparece** em erro responses (Meta não echoa auth no erro)
- ⚠️ **Porém:** Se hookey retornar erro com token espelhado (improvável, mas risco zero?), seria gravado em metadata

**Cenário 3: Console logs**
```ts
// webhook.ts:136, 147, 211
console.error("Falha ao processar comentario do webhook Instagram", error);
```

**Constatação:**
- `error` = GraphApiError instância
- Contém: `message`, `status`, `body` (resposta Meta)
- ✅ **Seguro** — GraphApiError construtor recebe apenas parsed message, não token

**Status:** ✅ APROVADO — Token não vaza via erros, conforme implementado

---

### 4. ⚠️ Resolução de conta e isolamento no webhook
**Severidade:** 🟠 MÉDIO (um aspecto quebrado)  
**Arquivo:** `app/api/webhook/instagram/route.ts:109-125`

```ts
if (!entry.id) continue;

const [account] = await db
  .select()
  .from(igAccounts)
  .where(eq(igAccounts.igUserId, entry.id))
  .limit(1);

if (!account || !account.active) {
  console.warn(
    `Webhook Instagram: entry.id ${entry.id} nao corresponde a nenhuma ig_account ativa cadastrada -- evento descartado`,
  );
  continue;
}
```

**Constatação:**
- ✅ `entry.id` (do webhook Meta) = Instagram Business Account ID
- ✅ Resolve para `igAccounts.igUserId` matching
- ✅ Verifica se conta está ativa (`!account.active`)
- ✅ Se não encontrar, descarta evento completamente
- ✅ Todas as automações/contatos/atividades escrevem `igAccountId` (isolamento garantido)

**Teste de Isolamento:**
- Comentário vem de Conta A → `entry.id = "conta-a-id"`
- Query busca `where(eq(igAccounts.igUserId, "conta-a-id"))`
- Automações filtradas por `eq(automations.igAccountId, account.id)`
- Contatos isolados por unique index `(igAccountId, igUserId)`
- ✅ **Isolamento correto**

**Status:** ✅ APROVADO — Isolamento de contas no webhook está seguro

**Porém:** Ver issue #5 sobre automations.updateAutomation

---

### 5. ❌ ISSUE: updateAutomation não valida ownership de conta
**Severidade:** 🔴 CRÍTICO (isolamento quebrado no painel)  
**Arquivo:** `app/(admin)/automations/actions.ts:95-110`

```ts
export async function updateAutomation(id: string, formData: FormData) {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("ID de automação inválido.");
  }

  const input = parseAutomationInput(formData);

  const db = getDb();
  await db
    .update(automations)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(automations.id, id));
  // ... NO VALIDATION THAT OLD AUTOMATION BELONGS TO THE SAME ACCOUNT!
}
```

**Vulnerabilidade:**
1. Pegue ID de automação da Conta A
2. Edite via formulário
3. Selecione Conta B no dropdown
4. Servidor atualiza a automação para apontar à Conta B
5. Automação da Conta A agora executa sob Conta B
6. ❌ **Isolamento quebrado**

**PoC:**
```
GET /automations/[conta-a-automation-id]/edit → obtém automation ID
POST /automations/[conta-a-automation-id]/edit com igAccountId="[conta-b-id]"
→ Update sem validação → automation agora usa token de Conta B
```

**Impacto:**
- Automação pode redirecionar DMs de uma conta para outra
- Cross-account leak de automations
- Não há acesso direto ao token, mas automação poderia ser desativada/modificada

**Solução:**
```ts
export async function updateAutomation(id: string, formData: FormData) {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("ID de automação inválido.");
  }

  const input = parseAutomationInput(formData);

  const db = getDb();
  
  // 🔧 VALIDAR que automation atual pertence à igAccountId que está sendo atualizado
  const [existing] = await db
    .select({ igAccountId: automations.igAccountId })
    .from(automations)
    .where(eq(automations.id, id))
    .limit(1);
  
  if (!existing) {
    throw new Error("Automação não encontrada.");
  }
  
  // ⚠️ Opção 1: Não permitir trocar de conta
  if (existing.igAccountId !== input.igAccountId) {
    throw new Error("Não é possível trocar a conta de uma automação existente.");
  }
  
  // OU
  // ⚠️ Opção 2: Sempre usar a conta da automação original (ignorar input)
  // (mais seguro, mas menos flexível)
  
  await db
    .update(automations)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(automations.id, id));

  revalidatePath("/automations");
  redirect("/automations");
}
```

**Status:** ❌ ISSUE CRÍTICA — Corrigir antes de qualquer multi-tenant em produção

---

## 🆕 ACHADOS ADICIONAIS

### Achado 1: ⚠️ Rota /accounts não está protegida por proxy.ts
**Severidade:** 🟠 MÉDIO  
**Arquivo:** `proxy.ts:3-5`

```ts
export const config = {
  matcher: ["/automations/:path*", "/contacts/:path*", "/activity/:path*"],
};
```

**Constatação:**
- ❌ `/accounts` **não está** no matcher!
- Qualquer pessoa sem autenticação pode:
  - Acessar GET `/accounts` → ver lista de contas (username, igUserId, token expiry, status)
  - Acessar GET `/accounts/[id]/edit` → ver formulário de edição (mas token não aparece)
  - Tentar POST `updateIgAccount` via formulário (ação está desprotegida!)

**Impacto:**
- Conhecimento de contas cadastradas (informação leakada)
- Risco baixo de edição de token (servidor action não valida auth, mas proxy não rota a página)
- Pages não têm auth, apenas page.tsx em server-side (sem middleware)

**Solução:**
```ts
export const config = {
  matcher: [
    "/automations/:path*",
    "/contacts/:path*",
    "/activity/:path*",
    "/accounts/:path*",  // ← ADICIONAR
  ],
};
```

**Status:** ⚠️ CORRIGIR — Adicionar /accounts ao matcher do proxy

---

### Achado 2: ⚠️ Editar conta não valida ownership
**Severidade:** 🟡 BAIXO (menor que automations)  
**Arquivo:** `app/(admin)/accounts/actions.ts:70-96`

```ts
export async function updateIgAccount(id: string, formData: FormData) {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("ID de conta inválido.");
  }

  const input = parseIgAccountInput(formData);

  const db = getDb();
  await db
    .update(igAccounts)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(igAccounts.id, id));
  // ... OK, mas não valida que conta existe
}
```

**Constatação:**
- Se ID inválido, query faz UPDATE 0 rows silenciosamente
- Sem erro, sem confirmação
- Não é vulnerability (ID é gerado server-side UUID), mas é fraco defensivamente

**Solução Sugerida:**
```ts
const result = await db
  .update(igAccounts)
  .set({ ...input, updatedAt: new Date() })
  .where(eq(igAccounts.id, id));

if (result.rowCount === 0) {
  throw new Error("Conta não encontrada.");
}
```

**Status:** 🟡 MENOR — Melhorar, não é crítico

---

### Achado 3: ✅ Componentes de formulário não expõem token
**Severidade:** 🟢 BOM  
**Arquivos:**
- `app/(admin)/automations/_components/AutomationForm.tsx` — não toca token ✓
- `app/(admin)/accounts/_components/IgAccountForm.tsx` — esconde token ✓
- `app/(admin)/activity/page.tsx` — não puxa token ✓

**Constatação:** Nenhum formulário acessa ou exibe `accessToken`

**Status:** ✅ APROVADO

---

### Achado 4: ✅ Proxy.ts implementa timing-safe compare (corrigido)
**Severidade:** 🟢 BOM (resolvido da revisão anterior)  
**Arquivo:** `proxy.ts:17-24`

```ts
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

**Constatação:**
- ✅ Implementação timing-safe manual (porque proxy.ts roda em edge runtime)
- ✅ Sem branches condicionais após primeira comparação
- ✅ Usada em linha 61: `if (!timingSafeEqualHex(expectedHash, providedHash))`

**Status:** ✅ APROVADO — Issue anterior corrigido

---

### Achado 5: ✅ Contacts isolation por (igAccountId, igUserId)
**Severidade:** 🟢 BOM  
**Arquivo:** `src/db/schema.ts:75-82`

```ts
uniqueIndex("contacts_ig_account_id_ig_user_id_idx").on(
  table.igAccountId,
  table.igUserId,
),
```

**Constatação:**
- ✅ Mesma pessoa pode existir em múltiplas contas
- ✅ Isoladas por (conta, usuário) — não há mixing

**Status:** ✅ APROVADO

---

### Achado 6: ⚠️ Activity page não filtra por conta
**Severidade:** 🟡 BAIXO  
**Arquivo:** `app/(admin)/activity/page.tsx:16-33`

```ts
const rows = await db
  .select({ ... })
  .from(activityLog)
  .innerJoin(igAccounts, eq(activityLog.igAccountId, igAccounts.id))
  .leftJoin(automations, eq(activityLog.automationId, automations.id))
  .leftJoin(contacts, eq(activityLog.contactId, contacts.id))
  .orderBy(desc(activityLog.createdAt))
  .limit(100);
```

**Constatação:**
- ❌ Mostra últimas 100 atividades de **TODAS as contas**
- Sem filtro por `igAccountId`
- Se houver 10 contas, verá mix de eventos
- Não é vulnerability (dados são internos, admin password protegido), mas é confuso
- Sugestão: Adicionar filtro ou selector de conta

**Impacto:** Baixo (visual/UX, não segurança)

**Status:** 🟡 MENOR — Considerar adicionar filtro por conta

---

## 📊 RESUMO EXECUTIVO

| Foco | Status | Risco | Ação |
|------|--------|-------|------|
| 1 — Token em plain text no DB | ✅ Aceitável | Baixo | Monitorar, considerar encriptação após v1 |
| 2 — Token no formulário | ✅ Seguro | Nenhum | OK |
| 3 — Token em erros Graph API | ✅ Seguro | Nenhum | OK |
| 4 — Isolamento de contas webhook | ✅ Seguro | Nenhum | OK |
| 5 — **updateAutomation sem validação** | ❌ CRÍTICO | Alto | **CORRIGIR URGENTE** |

---

## 🔴 ISSUES CRÍTICAS

### Issue #1: updateAutomation permite reatribuição de conta
- **Arquivo:** `app/(admin)/automations/actions.ts:95-110`
- **Risco:** Cross-account automation modification
- **Solução:** Validar que `existing.igAccountId === input.igAccountId`

### Issue #2: /accounts não protegido por proxy
- **Arquivo:** `proxy.ts:3-5`
- **Risco:** Acesso não autenticado a lista de contas
- **Solução:** Adicionar `/accounts/:path*` ao matcher

---

## 🟡 ISSUES MENORES

- Editar conta não valida se existe (UPDATE 0 rows silenciosamente)
- Activity page mostra mistura de todas as contas (sem filtro)

---

## ✅ CHECKLIST DE SEGURANÇA DO ACCESS TOKEN

- [x] Token não aparece em formulários
- [x] Token não é reenviado ao editar
- [x] Token não vaza em erros de Graph API
- [x] Token não aparece em logs de console
- [x] Token não aparece em metadata do activityLog
- [x] Token não aparece em HTML renderizado
- [ ] ❌ Rotas de gerenciar contas não estão protegidas por auth
- [ ] ❌ updateAutomation permite trocar conta (possível manipulação)

---

**Fim da revisão de segurança**
