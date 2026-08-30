# REVISÃO DE CÓDIGO — INSTAGRAM DM AUTOMATION
## Validador (Crivo) — Análise Completa

**Data:** 2026-08-29  
**Revisor:** Validador (Crivo)  
**Status:** Pronto para correção

---

## ✅ PONTOS BEM IMPLEMENTADOS

### Verificação HMAC
- **Arquivo:** `app/api/webhook/instagram/route.ts:51-68`
- ✓ Usa `crypto.timingSafeEqual()` (linha 67) — timing-safe, não vulnerável a timing attacks
- ✓ Lê `rawBody` via `request.text()` ANTES de qualquer parse (linha 71)
- ✓ Validação correta de scheme SHA256 e hex parsing

---

## 🔴 ACHADOS CRÍTICOS (Bloqueia produção)

### 1. CRÍTICO: Processamento síncrono bloqueia resposta ao webhook
- **Severidade:** 🔴 CRÍTICO
- **Arquivo:** `app/api/webhook/instagram/route.ts:70-193`
- **Problema:** 
  - Handler processa TODO o loop de comentários/automações/DMs **antes** de responder 200 (linha 192)
  - Loops aninhados: Entrada → Mudanças → Automações → DB inserts → Graph API calls
  - Sem timeout protection, sem async deferral
- **Risco:** 
  - Múltiplos comentários/automações → facilmente ultrapassa 5s de timeout
  - Meta desativa webhook subscription se não receber 200 rápido
  - Perda de eventos futuros
- **Solução Sugerida:**
  ```ts
  export async function POST(request: NextRequest) {
    const rawBody = await request.text();
    
    if (!isValidSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
    
    let payload: InstagramWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as InstagramWebhookPayload;
    } catch {
      return new NextResponse("Invalid JSON", { status: 400 });
    }
    
    // Responder 200 IMEDIATAMENTE
    const response = new NextResponse("EVENT_RECEIVED", { status: 200 });
    
    // Delegar processamento para DEPOIS (usando next/server after)
    import { after } from "next/server";
    after(async () => {
      // TODO: Mover todo o loop (linhas 84-190) para cá
      await processWebhookAsync(payload);
    });
    
    return response;
  }
  ```
- **Alternativa:** Enfileirar em Bull/Redis/Vercel KV para background job

---

### 2. CRÍTICO: Sem proteção contra processamento duplicado
- **Severidade:** 🔴 CRÍTICO
- **Arquivo:** `src/db/schema.ts:44-60` (falta constraint)
- **Problema:**
  - Não há verificação se o mesmo `igCommentId` já foi processado
  - Tabela `activityLog` não tem unique constraint em `igCommentId + eventType`
  - Quando Meta reenvia webhook (por timeout/retry), código processa **novamente**
  - Mesmo comentário cria múltiplos contatos, múltiplas atividades, múltiplas DMs
- **Lacuna Real Confirmada:** Nenhuma proteção idempotente
- **Solução Sugerida:**
  - Opção A: Adicionar unique index na migration:
    ```sql
    CREATE UNIQUE INDEX activity_log_comment_received_idx 
    ON activity_log(ig_comment_id) 
    WHERE event_type = 'comment_received';
    ```
  - Opção B: Query antes de insertar (linha 100-105):
    ```ts
    const existing = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.igCommentId, commentId),
          eq(activityLog.eventType, "comment_received")
        )
      )
      .limit(1);
    
    if (existing.length > 0) continue; // Skip duplicata
    ```

---

### 3. CRÍTICO: Sem proteção contra loop infinito
- **Severidade:** 🔴 CRÍTICO
- **Arquivo:** `app/api/webhook/instagram/route.ts:90-98`
- **Problema:**
  - Não verifica se `igUserId` é a própria conta (`IG_BUSINESS_ACCOUNT_ID`)
  - Se webhook captura respostas próprias da conta, cria loop infinito:
    - Conta comenta via automation → Webhook recebe notificação → Envia DM → Loop
  - Conta pode acabar spamando a si mesma ou usuários
- **Lacuna Real Confirmada:** Nenhum guarda contra `from.id === BUSINESS_ACCOUNT_ID`
- **Solução Sugerida:**
  ```ts
  const igUserId = value?.from?.id;
  
  // ⬇️ ADICIONAR ANTES DE LINHA 97
  if (igUserId === process.env.IG_BUSINESS_ACCOUNT_ID) continue;
  
  if (!commentId || !igUserId) continue;
  ```
- **Nota:** Remover envio de public reply se for comment próprio também (loop público)

---

### 4. CRÍTICO: Tratamento de erro genérico insuficiente
- **Severidade:** 🔴 CRÍTICO
- **Arquivo:** `app/api/webhook/instagram/route.ts:99-188`
- **Problema:**
  - Apenas loga erro no catch externo (linha 186-188)
  - Falhas **ANTES** do primeiro try/catch (linhas 100-120) não são tratadas:
    - `db.insert(activityLog)` falha (linha 100-105) → handler quebra
    - `db.select()` falha (linha 107-120) → handler quebra
    - `contacts.insert()` falha (linha 128-135) → handler quebra
  - Handler retorna 200 mesmo com erro interno
  - Meta pensa que sucesso, mas dados não foram processados
- **Risco:** 
  - Dados perdidos silenciosamente
  - Automações não acionam
  - Sem auditoria de falhas
- **Solução Sugerida:**
  ```ts
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      
      try {
        // TODO: TODO O BLOCO 86-190 ENTRA AQUI
        const value = change.value;
        // ... resto do processamento
      } catch (error) {
        console.error(
          `Erro ao processar comentário ${change.value?.id}:`,
          error instanceof Error ? error.message : String(error),
          {
            igCommentId: change.value?.id,
            igUserId: change.value?.from?.id,
            timestamp: new Date().toISOString(),
          }
        );
        // Log para Sentry/monitoring também
        // Ainda assim continua (não quebra resposta ao Meta)
      }
    }
  }
  
  // Ao final, **sempre** responder 200
  return new NextResponse("EVENT_RECEIVED", { status: 200 });
  ```

---

## 🟠 BUGS DE API/IMPLEMENTAÇÃO

### 5. BUG CONFIRMADO: Endpoint private reply errado
- **Severidade:** 🟠 MÉDIO (já conhecido)
- **Arquivo:** `src/lib/instagram.ts:52`
- **Problema:**
  ```ts
  return graphApiPost(`${commentId}/private_replies`, { message });
  ```
  - Endpoint errado: `POST /{comment-id}/private_replies` não existe em API v21.0+
  - Todas as chamadas de private reply **falham silenciosamente**
- **Solução Correta:**
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
- **Referência:** Meta Graph API v21.0 docs

---

### 6. MÉDIO: Headers Graph API imprecisos
- **Severidade:** 🟠 MÉDIO
- **Arquivo:** `src/lib/instagram.ts:34-37`
- **Problema:**
  ```ts
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, {
    method: "POST",
    body,  // URLSearchParams, mas sem header explícito
  });
  ```
  - Falta header explícito de Content-Type
  - URLSearchParams infere tipo, mas especificação está incompleta
  - Meta pode rejeitar em alguns casos (strict validation)
- **Solução Sugerida:**
  ```ts
  const res = await fetch(`${GRAPH_API_BASE}/${path}`, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  ```

---

## 🔐 SEGURANÇA

### 7. SEGURANÇA: Painel admin sem autenticação
- **Severidade:** 🟠 MÉDIO (ALTO se produção)
- **Arquivo:** 
  - `app/(admin)/layout.tsx` — sem middleware auth
  - `app/(admin)/automations/actions.ts:42-66` — sem validação de ownership
- **Problema:**
  - ❌ Sem session/auth middleware
  - ❌ `updateAutomation(id, formData)` não valida se `id` pertence ao usuário
  - ❌ Qualquer pessoa com acesso URL `/automations` pode editar/deletar automações
  - ❌ Sem rate limiting na criação/atualização
- **Risco:** 
  - Acesso não autorizado a painel
  - Modificação/deleção de automações de outros usuários
  - Abuse de recursos
- **Solução Sugerida:**
  - Implementar NextAuth.js ou similar
  - Adicionar middleware em `middleware.ts` para proteger `/admin`
  - Validar `userId` em cada server action (exemplo):
    ```ts
    export async function updateAutomation(id: string, formData: FormData) {
      const session = await auth(); // ou getCurrentUser()
      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }
      
      // Validar que automação pertence ao usuário
      const db = getDb();
      const automation = await db.query.automations.findFirst({
        where: eq(automations.id, id),
      });
      
      if (!automation || automation.userId !== session.user.id) {
        throw new Error("Automation not found or unauthorized");
      }
      
      // Continuar atualização...
    }
    ```
  - Adicionar `userId` ao schema de `automations`:
    ```ts
    export const automations = pgTable("automations", {
      id: uuid("id").primaryKey().defaultRandom(),
      userId: text("user_id").notNull(), // ⬅️ NOVO
      name: text("name").notNull(),
      // ... resto
    });
    ```

---

### 8. SEGURANÇA: Sem limite de tamanho de mensagem/comentário
- **Severidade:** 🟠 MÉDIO
- **Arquivo:** 
  - `app/api/webhook/instagram/route.ts:92` — `commentText` sem validação
  - `app/(admin)/automations/actions.ts:19-40` — `dmMessage` sem validação
- **Problema:**
  - Comentário pode ser arbitrariamente grande
  - Armazenado em `jsonb` sem limit
  - Risco de DoS via storage abuse
  - Mensagem DM pode exceder limite Instagram (4096 chars)
- **Solução Sugerida:**
  ```ts
  // Em webhook (linha 92)
  const MAX_COMMENT_LENGTH = 2048;
  const commentText = (value?.text ?? "").substring(0, MAX_COMMENT_LENGTH);
  
  // Em server action (linha 19-25)
  const MAX_DM_LENGTH = 4096;
  const dmMessage = requiredStr(formData, "dmMessage");
  
  if (!dmMessage || dmMessage.length > MAX_DM_LENGTH) {
    throw new Error("Mensagem de DM deve ter até 4096 caracteres.");
  }
  ```

---

### 9. SEGURANÇA: Validação fraca em server actions
- **Severidade:** 🟠 MÉDIO
- **Arquivo:** `app/(admin)/automations/actions.ts:19-40`, `42-66`
- **Problema:**
  ```ts
  const name = requiredStr(formData, "name");
  const dmMessage = requiredStr(formData, "dmMessage");
  
  if (!name || !dmMessage) {
    throw new Error("Nome e mensagem de DM são obrigatórios.");
  }
  // ❌ Apenas verifica presença, não tamanho/conteúdo
  ```
  - `name` pode ser 10000 caracteres (quebra UI)
  - `dmMessage` pode conter payloads/injections
  - `keyword` pode ser regex complexo (DoS)
  - `targetMediaId` não é validado (ID pode ser qualquer string)
- **Solução Sugerida:**
  ```ts
  function validateAutomationInput(formData: FormData) {
    const name = requiredStr(formData, "name");
    const dmMessage = requiredStr(formData, "dmMessage");
    const keyword = optionalStr(formData, "keyword");
    
    // Tamanhos
    if (!name || name.length > 255) {
      throw new Error("Nome deve ter 1-255 caracteres.");
    }
    if (!dmMessage || dmMessage.length > 4096) {
      throw new Error("Mensagem de DM deve ter 1-4096 caracteres.");
    }
    if (keyword && keyword.length > 512) {
      throw new Error("Palavra-chave deve ter até 512 caracteres.");
    }
    
    // Formatos
    const targetMediaId = optionalStr(formData, "targetMediaId");
    if (targetMediaId && !/^\d+$/.test(targetMediaId)) {
      throw new Error("Media ID deve conter apenas números.");
    }
    
    return { name, dmMessage, keyword, targetMediaId };
  }
  
  export async function createAutomation(formData: FormData) {
    const { name, dmMessage, keyword, targetMediaId } = validateAutomationInput(formData);
    // ... continuar
  }
  ```

---

## 📊 RESUMO POR SEVERIDADE

| Severidade | Qtd | Items | Impacto |
|-----------|-----|-------|---------|
| 🔴 CRÍTICO | 4 | 1, 2, 3, 4 | Bloqueia produção, perda de eventos, loops |
| 🟠 MÉDIO | 5 | 5, 6, 7, 8, 9 | Falhas de API, segurança, DoS |

---

## ✅ CHECKLIST PARA CORREÇÃO

- [ ] **Item 1:** Implementar `after()` do Next.js para responder 200 antes de processar
- [ ] **Item 2:** Adicionar unique constraint ou check de duplicata para `igCommentId`
- [ ] **Item 3:** Adicionar guarda `if (igUserId === IG_BUSINESS_ACCOUNT_ID) continue;`
- [ ] **Item 4:** Expandir try/catch para cobrir TODO o bloco de processamento
- [ ] **Item 5:** Corrigir endpoint de private reply (usar `/{ACCOUNT_ID}/messages`)
- [ ] **Item 6:** Adicionar header `Content-Type` explícito na fetch
- [ ] **Item 7:** Implementar autenticação + middleware + validação de ownership
- [ ] **Item 8:** Adicionar limites de tamanho para comentários e mensagens
- [ ] **Item 9:** Implementar validação robusta em server actions

---

## 🎯 PRIORIDADE IMEDIATA (Antes de produção)

1. **Crítico 1 + 2 + 3** — Timeout, duplicatas, loops (afetam funcionamento básico)
2. **Crítico 4** — Tratamento de erro (auditoria)
3. **Médio 5** — Endpoint private reply (funcionalidade não funciona)
4. **Médio 7** — Autenticação (segurança)

---

**Fim da revisão**
