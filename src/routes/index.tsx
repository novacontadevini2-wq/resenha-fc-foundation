import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CLUB } from "@/lib/club-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resenha FC — Gestão da pelada" },
      {
        name: "description",
        content:
          "Sistema oficial do Resenha FC Futebol Clube: jogadores, sorteio de equipes e torneios da pelada.",
      },
      { property: "og:title", content: "Resenha FC — Gestão da pelada" },
      {
        property: "og:description",
        content:
          "Sistema oficial do Resenha FC Futebol Clube: jogadores, sorteio de equipes e torneios da pelada.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app/principal", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="surface-navy flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <BrandMark size="lg" withName={false} />
      <div>
        <h1 className="text-title text-navy-foreground">{CLUB.fullName}</h1>
        <p className="mt-2 text-sm text-navy-foreground/70">
          {CLUB.schedule.dayLabel} · {CLUB.schedule.timeLabel} · {CLUB.venue.name}
        </p>
      </div>
      <Button asChild size="lg" className="h-12 w-full max-w-xs rounded-xl text-base">
        <Link to="/login">Entrar no sistema</Link>
      </Button>
    </div>
  );
}
