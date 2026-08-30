"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ImageOff,
  LayoutGrid,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { automations } from "@/src/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DataCard } from "../../_components/DataCard";
import type { AutomationActionState } from "../actions";

type Automation = typeof automations.$inferSelect;
type AccountOption = { id: string; username: string | null; igUserId: string };

type MediaItem = {
  id: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
  mediaType: string | null;
};

function FormSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function MediaCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-card text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        selected
          ? "border-primary ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-input"
      )}
    >
      {children}
    </button>
  );
}

function MediaThumbnail({
  item,
  broken,
  onError,
}: {
  item: MediaItem;
  broken: boolean;
  onError: () => void;
}) {
  if (!item.thumbnailUrl || broken) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-muted">
        <ImageOff className="size-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- thumbnail vem de domínios variáveis do CDN da Instagram/Meta, incompatível com o allowlist do next/image
    <img
      src={item.thumbnailUrl}
      alt={item.caption ?? "Post do Instagram"}
      className="aspect-square w-full object-cover"
      onError={onError}
    />
  );
}

export function AutomationForm({
  action,
  automation,
  accounts,
  submitLabel,
}: {
  action: (
    prevState: AutomationActionState,
    formData: FormData,
  ) => Promise<AutomationActionState>;
  automation?: Automation;
  accounts: AccountOption[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});

  const [selectedAccountId, setSelectedAccountId] = useState(
    automation?.igAccountId ?? ""
  );
  const [mediaItems, setMediaItems] = useState<MediaItem[] | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [brokenThumbnails, setBrokenThumbnails] = useState<Set<string>>(
    new Set()
  );
  // Derivado em vez de state próprio: `mediaItems` só volta a ser null quando
  // a conta muda (handleAccountChange) ou no mount inicial, então "ainda não
  // chegou resposta pra conta atual" já significa "carregando".
  const mediaLoading = selectedAccountId !== "" && mediaItems === null;

  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(
    automation?.targetMediaId ?? null
  );
  const [captionValue, setCaptionValue] = useState(
    automation?.targetMediaCaption ?? ""
  );
  const [captionEditedManually, setCaptionEditedManually] = useState(false);

  useEffect(() => {
    if (!selectedAccountId) return;

    let cancelled = false;

    fetch(`/api/accounts/${selectedAccountId}/media`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setMediaError(
            body?.error ?? "Não foi possível carregar os posts dessa conta."
          );
          setMediaItems([]);
          return;
        }
        setMediaItems(Array.isArray(body) ? body : []);
      })
      .catch(() => {
        if (!cancelled) {
          setMediaError("Não foi possível carregar os posts dessa conta.");
          setMediaItems([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAccountId]);

  function handleAccountChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedAccountId(event.target.value);
    setSelectedMediaId(null);
    setCaptionValue("");
    setCaptionEditedManually(false);
    setMediaItems(null);
    setMediaError(null);
  }

  function selectMedia(id: string | null, caption?: string | null) {
    setSelectedMediaId(id);
    // Sincroniza a legenda a cada troca de post (inclusive limpando quando o
    // post não tem legenda, ou quando volta pra "qualquer post"), mas só
    // enquanto o usuário não tiver editado o campo manualmente.
    if (!captionEditedManually) {
      setCaptionValue(caption ?? "");
    }
  }

  const currentMediaKnown =
    selectedMediaId === null ||
    (mediaItems?.some((item) => item.id === selectedMediaId) ?? false);
  const showOrphanCard =
    selectedMediaId !== null && mediaItems !== null && !currentMediaKnown;

  return (
    <form action={formAction} className="max-w-xl">
      <DataCard>
        <div className="flex flex-col gap-6 p-5">
          {state.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={automation?.name}
            />
          </div>

          <Separator />

          <FormSection label="Gatilho">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="igAccountId">Conta do Instagram</Label>
              {/* select nativo de propósito: precisa funcionar sem JavaScript no submit do form */}
              <select
                id="igAccountId"
                name="igAccountId"
                required
                defaultValue={automation?.igAccountId ?? ""}
                onChange={handleAccountChange}
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Selecione uma conta
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.username ?? account.igUserId}
                  </option>
                ))}
              </select>
            </div>

            {accounts.length === 0 && (
              <Alert>
                <TriangleAlert />
                <AlertDescription>
                  Nenhuma conta do Instagram cadastrada.{" "}
                  <Link href="/accounts/new">Crie uma conta</Link> antes de
                  criar uma automação.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label>Post/reel alvo</Label>
              <input
                type="hidden"
                name="targetMediaId"
                value={selectedMediaId ?? ""}
              />

              {!selectedAccountId ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Selecione uma conta para ver os posts disponíveis.
                </p>
              ) : mediaError ? (
                <Alert>
                  <TriangleAlert />
                  <AlertDescription>{mediaError}</AlertDescription>
                </Alert>
              ) : null}

              {selectedAccountId && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  <MediaCard
                    selected={selectedMediaId === null}
                    onSelect={() => selectMedia(null)}
                  >
                    <div className="flex aspect-square w-full items-center justify-center bg-accent">
                      <LayoutGrid
                        className="size-5 text-accent-foreground"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        Qualquer post/reel da conta
                      </p>
                    </div>
                  </MediaCard>

                  {showOrphanCard && selectedMediaId && (
                    <MediaCard
                      selected
                      onSelect={() => setSelectedMediaId(selectedMediaId)}
                    >
                      <div className="flex aspect-square w-full items-center justify-center bg-muted">
                        <ImageOff
                          className="size-5 text-muted-foreground"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-2 text-xs font-medium text-foreground">
                          Post atual
                        </p>
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {selectedMediaId}
                        </p>
                      </div>
                    </MediaCard>
                  )}

                  {mediaLoading &&
                    Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="flex flex-col overflow-hidden rounded-lg border border-border"
                      >
                        <Skeleton className="aspect-square w-full rounded-none" />
                        <div className="p-2">
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </div>
                    ))}

                  {!mediaLoading &&
                    mediaItems?.map((item) => (
                      <MediaCard
                        key={item.id}
                        selected={selectedMediaId === item.id}
                        onSelect={() => selectMedia(item.id, item.caption)}
                      >
                        <MediaThumbnail
                          item={item}
                          broken={brokenThumbnails.has(item.id)}
                          onError={() =>
                            setBrokenThumbnails((prev) =>
                              new Set(prev).add(item.id)
                            )
                          }
                        />
                        <div className="p-2">
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.caption ?? "Sem legenda"}
                          </p>
                        </div>
                      </MediaCard>
                    ))}
                </div>
              )}

              {selectedAccountId &&
                !mediaLoading &&
                !mediaError &&
                mediaItems?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum post encontrado nessa conta ainda.
                  </p>
                )}

              {mediaLoading && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Carregando posts…
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Deixe em &quot;Qualquer post/reel da conta&quot; para aplicar
                a automação a todos os posts.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="targetMediaCaption">Legenda da mídia alvo</Label>
              <Textarea
                id="targetMediaCaption"
                name="targetMediaCaption"
                value={captionValue}
                onChange={(event) => {
                  setCaptionValue(event.target.value);
                  setCaptionEditedManually(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Preenchida automaticamente ao escolher um post; pode ser
                editada livremente.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="keyword">Palavra-chave</Label>
              <Input
                id="keyword"
                name="keyword"
                defaultValue={automation?.keyword ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para responder a qualquer comentário.
              </p>
            </div>
          </FormSection>

          <Separator />

          <FormSection label="Mensagens">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dmMessage">Mensagem de DM</Label>
              <Textarea
                id="dmMessage"
                name="dmMessage"
                required
                defaultValue={automation?.dmMessage}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="publicReplyMessage">
                Resposta pública no comentário
              </Label>
              <Textarea
                id="publicReplyMessage"
                name="publicReplyMessage"
                defaultValue={automation?.publicReplyMessage ?? ""}
              />
            </div>
          </FormSection>

          <Separator />

          <FormSection label="Limites">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cooldownMinutes">
                Cooldown entre DMs pro mesmo contato (minutos)
              </Label>
              <Input
                id="cooldownMinutes"
                name="cooldownMinutes"
                type="number"
                min={0}
                defaultValue={String(automation?.cooldownMinutes ?? 1440)}
              />
              <p className="text-xs text-muted-foreground">
                0 = sem limite (o contato pode receber DM desta automação
                novamente a qualquer momento).
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="oncePerContact"
                defaultChecked={automation?.oncePerContact ?? false}
                className="size-4 rounded border-input accent-primary"
              />
              Enviar DM apenas uma vez por contato, ignorando o cooldown
            </label>

            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                name="active"
                defaultChecked={automation?.active ?? true}
                className="size-4 rounded border-input accent-primary"
              />
              Ativa
            </label>
          </FormSection>

          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : submitLabel}
            </Button>
            <Button asChild variant="outline">
              <Link href="/automations">Cancelar</Link>
            </Button>
          </div>
        </div>
      </DataCard>
    </form>
  );
}
