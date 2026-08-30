"use client";

import { useEffect } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-red-50">
        <AlertOctagon className="size-5 text-red-600" strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">Algo deu errado</p>
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar esta página. Tente novamente.
        </p>
      </div>
      <Button onClick={reset} size="sm">
        Tentar de novo
      </Button>
    </div>
  );
}
