# REVISÃO DE CÓDIGO — SEGUNDA VALIDAÇÃO (PÓS-CORREÇÃO)
## Validador (Crivo) — Verificação de Fixes do Alicerce

**Data:** 2026-08-29  
**Revisor:** Validador (Crivo)  
**Baseline:** crivo-review.md (9 achados críticos/médios)  
**Status:** Validação finalizada com 1 issue pendente

---

## ✅ VALIDAÇÃO DO CHECKLIST (1-9)

### 1. ✅ CRÍTICO: Processamento síncrono bloqueia resposta ao webhook
**Status:** APROVADO
- **Verificação:**
  - Importa `after` de "next/server" (linha 1) ✓
  - Responde 200 **imediatamente** (linha 102) ✓
  - TODO o processamento delegado via `after()` (linha 100) ✓
  - Função `processWebhookPayload` (linhas 105-133) executa async DEPOIS ✓
- **Constatação:** Implementação correta. Webhook responde em ~0ms, Meta recebe 200 rápido, processamento ocorre em background sem timeout risk.

---

### 2. ✅ CRÍTICO: Sem proteção contra duplicatas (idempotência)
**Status:** APROVADO ✅
- **Verificação:**
  - **Schema** (`src/db/schema.ts:74-76`):
    ```ts
    uniqueIndex("activity_log_comment_received_idx")
      .on(table.igCommentId)
      .where(sql`${table.eventType} = 'comment_received'`)
    ```
  - **Webhook** (`app/api/webhook/instagram/route.ts:160-163`):
    ```ts
    .onConflictDoNothing({
      target: activityLog.igCommentId,
      where: sql`${activityLog.eventType} = 'comment_received'`,
    })
    ```
  
  - **ATENÇÃO ESPECIAL #1 — WHERE clause bate?**
    - Schema: `where(sql\`${table.eventType} = 'comment_received'\`)`
    - Webhook: `where: sql\`${activityLog.eventType} = 'comment_received'\``
    - ✅ **SIM, bate exatamente.** Condição é idêntica em ambos lugares.
  
  - **Idempotência:**
    - Se Meta reentregar mesmo webhook, insert tenta novamente
    - Unique index + condition detecta conflito
    - `onConflictDoNothing` descarta silenciosamente
    - Verifica `if (!inserted) return;` (linha 166) para pular processamento de duplicata ✓

- **Constatação:** Proteção idempotente correta. Reentrâncias de webhook são descartadas.

---

### 3. ✅ CRÍTICO: Sem proteção contra loop infinito
**Status:** APROVADO ✅
- **Verificação:**
  - Linha 145: `if (igUserId === process.env.IG_BUSINESS_ACCOUNT_ID) return;` ✓
  - Linha 148: `if (value.parent_id) return;` (bonus: ignora nested replies) ✓
  
- **Constatação:** Guarda implementada. Conta não pode comentar em si mesma, além disso respostas aninhadas são ignoradas (reduz spam).

---

### 4. ✅ CRÍTICO: Tratamento de erro insuficiente
**Status:** APROVADO ✅
- **Verificação — Múltiplas camadas:**
  - **Camada 1** (linhas 113-130): Englobo TODO `processComment` em try/catch
  - **Camada 2** (linhas 188-191): Try/catch para `processAutomationMatch`
  - **Camada 3** (linhas 251-275): Try/catch para `sendPrivateReply`
  - **Camada 4** (linhas 277-299): Try/catch para `postPublicReply`
  
  - **Tratamento de erro de logging** (linhas 119-129):
    ```ts
    try {
      await db.insert(activityLog).values({ ... });
    } catch (logError) {
      console.error("Falha ao gravar activityLog de erro", logError);
    }
    ```
    Nested try/catch previne que falha de logging derrube handler ✓
  
  - **Resposta ao Meta:** Sempre retorna 200 (linha 102), mesmo com erros ✓

- **Constatação:** Tratamento robusto, nenhum erro quebra a resposta ao webhook.

---

### 5. ✅ BUG: Endpoint private reply errado
**Status:** APROVADO ✅
- **Verificação** (`src/lib/instagram.ts:55-65`):
  ```ts
  export function sendPrivateReply(commentId: string, message: string) {
    const igBusinessAccountId = process.env.IG_BUSINESS_ACCOUNT_ID;
    if (!igBusinessAccountId) {
      throw new Error("IG_BUSINESS_ACCOUNT_ID nao esta configurado");
    }
  
    return graphApiPost(`${igBusinessAccountId}/messages`, {
      recipient: JSON.stringify({ comment_id: commentId }),
      message: JSON.stringify({ text: message }),
    });
  }
  ```
  
  - **Endpoint correto:** `/${igBusinessAccountId}/messages` ✓ (Meta Instagram Platform API v21.0)
  
  - **ATENÇÃO ESPECIAL #3 — Serialização de recipient/message?**
    ```ts
    recipient: JSON.stringify({ comment_id: commentId })    // ← string JSON
    message: JSON.stringify({ text: message })               // ← string JSON
    ```
    - Ambos são JSON.stringify individuais ✓
    - URLSearchParams.encode() os adiciona form-encoded ✓
    - Header `Content-Type: application/x-www-form-urlencoded` (linha 36 instagram.ts) ✓
    - Formato final: `recipient=%7B%22comment_id%22%3A%22...%22%7D&message=%7B%22text%22%3A%22...%22%7D&access_token=...`
    - **Constatação:** Serialização correta para Graph API.

- **Constatação:** Endpoint agora está correto, private replies funcionarão.

---

### 6. ✅ MÉDIO: Headers Graph API imprecisos
**Status:** APROVADO ✅
- **Verificação** (`src/lib/instagram.ts:34-38`):
  ```ts
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },  // ← ADICIONADO
    body,
  });
  ```
  
- **Constatação:** Header explícito adicionado.

---

### 7. ⚠️ SEGURANÇA: Painel admin sem autenticação
**Status:** PARCIALMENTE APROVADO ⚠️
- **Verificação:**
  - ✅ Autenticação Basic Auth implementada (`proxy.ts`)
  - ✅ Matcher protege rotas admin (linhas 3-5) ✓
  - ✅ Extrai e valida credenciais (linhas 36-43) ✓
  - ✅ Implementa SHA-256 hash (linhas 7-13) ✓
  
  - **ATENÇÃO ESPECIAL #4 — Comparação timing-safe?**
    ```ts
    const [expectedHash, providedHash] = await Promise.all([
      sha256Hex(adminPassword),
      sha256Hex(providedHash),
    ]);
  
    if (expectedHash !== providedHash) {  // ← ❌ NÃO É TIMING-SAFE
      return unauthorized();
    }
    ```
    - ❌ **VULNERABILITY ENCONTRADA:** Usa `!==` para comparar hashes
    - Comparação em string JavaScript é **vulnerable a timing attacks**
    - Atacante pode bruteforce senha medindo tempo de resposta
    - **Deveria usar:** `crypto.timingSafeEqual(Buffer.from(expectedHash), Buffer.from(providedHash))`

- **Constatação:** Autenticação estrutura está boa, mas comparação precisa de correção.

---

### 8. ✅ SEGURANÇA: Sem limite de tamanho de mensagem
**Status:** APROVADO ✅
- **Verificação:**
  - **Webhook** (`app/api/webhook/instagram/route.ts`):
    - Linha 9: `const MAX_COMMENT_TEXT_LENGTH = 2048;` ✓
    - Linha 140: `const commentText = (value.text ?? "").slice(0, MAX_COMMENT_TEXT_LENGTH);` ✓
    - Linha 123: Erro log também trunca ✓
  
  - **Server Actions** (`app/(admin)/automations/actions.ts`):
    - Linhas 33-35: `dmMessage.length` validado 1-4096 ✓
    - Linhas 37-40: `publicReplyMessage` até 4096 ✓
    - Lim schema: `text` fields têm tamanho natural do banco
  
- **Constatação:** Limites implementados.

---

### 9. ✅ SEGURANÇA: Validação fraca em server actions
**Status:** APROVADO ✅
- **Verificação** (`app/(admin)/automations/actions.ts:21-75`):
  - `name`: 1-255 chars (linhas 29-31) ✓
  - `dmMessage`: 1-4096 chars (linhas 33-35) ✓
  - `publicReplyMessage`: até 4096 chars (linhas 37-40) ✓
  - `keyword`: até 512 chars (linhas 43-45) ✓
  - `targetMediaId`: regex `/^\d+$/` (linhas 47-49) ✓
  - `cooldownMinutes`: integer >= 0 (linhas 51-62) ✓
  - `oncePerContact`: checkbox boolean (linha 72) ✓
  - `active`: checkbox boolean (linha 73) ✓
  
- **Constatação:** Validação robusta implementada.

---

## 🆕 ACHADOS ADICIONAIS (PÓS-CORREÇÃO)

### Novo Achado 1: Função matchesKeyword bem implementada
**Severidade:** 🟢 BOM
**Arquivo:** `src/lib/matching.ts:1-27`
- Suporta múltiplas keywords separadas por vírgula ✓
- Case-insensitive com normalize() ✓
- Remove acentos (NFD + removing combining marks) ✓
- Retorna `true` se keyword vazia/null (matches qualquer) ✓
- Usada no webhook (linha 181) ✓
- **Constatação:** Implementação limpa e correta.

---

### Novo Achado 2: Interface CommentContext e tipos refinados
**Severidade:** 🟢 BOM
**Arquivo:** `app/api/webhook/instagram/route.ts:35-43`
- Novo `CommentContext` interface (linhas 38-43) para passar contexto entre funções ✓
- Tipos extraídos: `Db`, `Automation` (linhas 35-36) ✓
- Reduz duplicação de parâmetros, facilita refactor futuro ✓
- **Constatação:** Bom pattern de engenharia.

---

### Novo Achado 3: Suporte a cooldown e oncePerContact
**Severidade:** 🟢 BOM
**Arquivo:** `app/api/webhook/instagram/route.ts:207-249`
- Implementação correta de `oncePerContact` (linhas 207-230) ✓
- Implementação correta de `cooldownMinutes` (linhas 231-249) ✓
- Ambos registram evento `cooldown_skipped` para auditoria ✓
- Schema suporta (linhas 26-28 schema.ts) ✓
- Server action valida (ações.ts) ✓
- **Constatação:** Feature funcional implementada.

---

### Novo Achado 4: ⚠️ UUID validation em server actions
**Severidade:** 🟡 BAIXO
**Arquivo:** `app/(admin)/automations/actions.ts:87-98`
- ⚠️ Função `updateAutomation(id: string, ...)` não valida se `id` é UUID válido
- ⚠️ Qualquer string como ID vai direto para `eq(automations.id, id)`
- ⚠️ Banco descarta silenciosamente (0 rows updated), sem erro
- ℹ️ Impacto: Não quebra funcionalmente, mas deveria validar format
- **Recomendação:** Adicionar validação UUID:
  ```ts
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  export async function updateAutomation(id: string, formData: FormData) {
    if (!UUID_PATTERN.test(id)) {
      throw new Error("Invalid automation ID");
    }
    // ... continuar
  }
  ```

---

### Novo Achado 5: Melhor tratamento de parent_id
**Severidade:** 🟢 BOM
**Arquivo:** `app/api/webhook/instagram/route.ts:148`
- Nova linha `if (value.parent_id) return;` ignora respostas aninhadas ✓
- Reduz spam (não processa replies to replies)
- **Constatação:** Bom refinamento.

---

### Novo Achado 6: eventType expandido para tracking
**Severidade:** 🟢 BOM
**Arquivo:** `src/db/schema.ts:61-62`
- Schema documenta event types: `comment_received | dm_sent | dm_failed | reply_posted | reply_failed | cooldown_skipped` ✓
- Novo `processing_error` tipo adicionado (linha 121 webhook) ✓
- Facilita auditoria e debugging ✓
- **Constatação:** Bom design.

---

## 📊 RESUMO EXECUTIVO

| Checklist | Status | Impacto |
|-----------|--------|---------|
| 1 — Timeout webhook | ✅ APROVADO | Crítico — 100% resolvido |
| 2 — Idempotência | ✅ APROVADO | Crítico — 100% resolvido |
| 3 — Loop infinito | ✅ APROVADO | Crítico — 100% resolvido |
| 4 — Tratamento erro | ✅ APROVADO | Crítico — 100% resolvido |
| 5 — Endpoint private reply | ✅ APROVADO | Médio — 100% resolvido |
| 6 — Headers Graph API | ✅ APROVADO | Médio — 100% resolvido |
| 7 — Auth painel | ⚠️ PARCIAL | Alto — 90% resolvido, 1 issue timing-safe |
| 8 — Limites tamanho | ✅ APROVADO | Médio — 100% resolvido |
| 9 — Validação actions | ✅ APROVADO | Médio — 100% resolvido |

---

## 🔴 ISSUE CRÍTICA PENDENTE

### Issue: proxy.ts usa comparação não-timing-safe para hash
- **Arquivo:** `proxy.ts:50`
- **Severidade:** 🔴 CRÍTICO (segurança)
- **Problema:**
  ```ts
  if (expectedHash !== providedHash) {  // ❌ VULNERABLE
    return unauthorized();
  }
  ```
- **Risco:** Timing attack na comparação de hash de senha
- **Solução:**
  ```ts
  import { timingSafeEqual } from "crypto";
  
  // Converter strings para Buffer
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const providedBuf = Buffer.from(providedHash, "hex");
  
  // Comparar com timing-safe
  const matches = expectedBuf.length === providedBuf.length && 
                  timingSafeEqual(expectedBuf, providedBuf);
  
  if (!matches) {
    return unauthorized();
  }
  ```
- **Prioridade:** Corrigir antes de produção

---

## 🟡 ISSUE MENOR PENDENTE

### Issue: Falta validação UUID em server actions
- **Arquivo:** `app/(admin)/automations/actions.ts:87`
- **Severidade:** 🟡 BAIXO
- **Problema:** `updateAutomation(id)` não valida se id é UUID válido
- **Impacto:** Nenhum (banco ignora), mas não é defensivo
- **Solução:** Adicionar regex validação antes de usar id em query

---

## ✅ CHECKLIST PÓS-REVISÃO

- [x] Webhook responde 200 em tempo
- [x] Idempotência protegida (unique index + onConflictDoNothing)
- [x] Loop infinito evitado
- [x] Erros capturados e logados
- [x] Endpoint private reply corrigido
- [x] Headers Graph API explícitos
- [x] Autenticação basic auth implementada
- [x] Limites de tamanho implementados
- [x] Validação em server actions
- [ ] **PENDENTE:** proxy.ts timing-safe compare
- [ ] **PENDENTE:** UUID validation em actions.ts

---

## 🎯 PRÓXIMOS PASSOS

1. **Crítico:** Corrigir proxy.ts (timing-safe compare)
2. **Menor:** Adicionar UUID validation em server actions
3. **Depois:** Build + teste de ponta-a-ponta no ambiente

---

**Fim da validação secundária**
