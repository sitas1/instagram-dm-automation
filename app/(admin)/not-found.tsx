import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent">
        <SearchX className="size-5 text-accent-foreground" strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          Página não encontrada
        </p>
        <p className="text-sm text-muted-foreground">
          O item que você procura não existe ou foi removido.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard">Voltar ao painel</Link>
      </Button>
    </div>
  );
}
