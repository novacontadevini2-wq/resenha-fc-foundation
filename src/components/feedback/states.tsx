import { AlertTriangle, Inbox, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Carregando...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12", className)} role="status">
      <Loader2 className="size-6 animate-spin text-orange" />
      <p className="text-meta">{label}</p>
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card-surface flex items-center gap-4 p-4">
          <Skeleton className="size-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-accent text-navy">
        <Inbox className="size-6" />
      </span>
      <h3 className="text-subtitle">{title}</h3>
      {description ? <p className="text-meta max-w-xs">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button size="lg" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "Não foi possível carregar os dados.",
  onRetry,
}: {
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <h3 className="text-subtitle">{title}</h3>
      <p className="text-meta max-w-xs">Verifique sua conexão e tente novamente.</p>
      {onRetry ? (
        <Button variant="outline" size="lg" className="mt-2" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}

export function ComingSoon({
  title,
  description = "Esta funcionalidade será disponibilizada em breve.",
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="card-surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-orange/12 text-orange">
        <Sparkles className="size-6" />
      </span>
      <h3 className="text-subtitle">{title}</h3>
      <p className="text-meta max-w-sm">{description}</p>
    </div>
  );
}
