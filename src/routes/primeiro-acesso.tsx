import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/primeiro-acesso")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso — Resenha FC" },
      {
        name: "description",
        content: "Ative seu acesso ao sistema de gestão da pelada do Resenha FC.",
      },
      { property: "og:title", content: "Primeiro acesso — Resenha FC" },
      {
        property: "og:description",
        content: "Ative seu acesso ao sistema de gestão da pelada do Resenha FC.",
      },
    ],
  }),
  component: FirstAccessPage,
});

function FirstAccessPage() {
  return (
    <div className="surface-navy flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark size="md" tone="light" />
        </div>
        <div className="card-surface space-y-4 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange/12 text-orange">
            <KeyRound className="size-6" />
          </span>
          <h1 className="text-title text-navy">Primeiro acesso</h1>
          <p className="text-meta">
            Aqui você poderá ativar seu acesso ao sistema do Resenha FC. O processo de ativação
            será liberado em breve pela administração do clube.
          </p>
          <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
