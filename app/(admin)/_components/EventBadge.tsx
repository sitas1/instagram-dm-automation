import {
  MessageSquare,
  Send,
  XCircle,
  MessageCircleReply,
  AlertTriangle,
  Clock,
  AlertOctagon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EventType =
  | "comment_received"
  | "dm_sent"
  | "dm_failed"
  | "reply_posted"
  | "reply_failed"
  | "cooldown_skipped"
  | "processing_error";

const EVENT_CONFIG: Record<
  EventType,
  { label: string; icon: LucideIcon; className: string }
> = {
  comment_received: {
    label: "Comentário recebido",
    icon: MessageSquare,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  dm_sent: {
    label: "DM enviada",
    icon: Send,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  dm_failed: {
    label: "DM falhou",
    icon: XCircle,
    className: "bg-red-50 text-red-700 ring-red-200",
  },
  reply_posted: {
    label: "Resposta publicada",
    icon: MessageCircleReply,
    className: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  reply_failed: {
    label: "Resposta falhou",
    icon: AlertTriangle,
    className: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  cooldown_skipped: {
    label: "Em cooldown",
    icon: Clock,
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  processing_error: {
    label: "Erro de processamento",
    icon: AlertOctagon,
    className: "bg-red-600 text-white ring-red-700",
  },
};

function isKnownEventType(value: string): value is EventType {
  return Object.prototype.hasOwnProperty.call(EVENT_CONFIG, value);
}

/**
 * `detail` distingue os dois motivos de cooldown_skipped:
 * "oncePerContact: ..." vs "cooldown ativo (...)".
 */
export function EventBadge({
  eventType,
  detail,
}: {
  eventType: string;
  detail?: string | null;
}) {
  if (!isKnownEventType(eventType)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
        {eventType}
      </span>
    );
  }

  const config = EVENT_CONFIG[eventType];
  const Icon = config.icon;
  const label =
    eventType === "cooldown_skipped" && detail
      ? detail.startsWith("oncePerContact")
        ? "Já contatado"
        : "Em cooldown"
      : config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        config.className
      )}
    >
      <Icon className="size-3" strokeWidth={2} />
      {label}
    </span>
  );
}
