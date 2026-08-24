import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { CLUB } from "@/lib/club-config";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Resenha FC" },
      {
        name: "description",
        content: "Acesse o sistema de gestão da pelada do Resenha FC Futebol Clube.",
      },
      { property: "og:title", content: "Entrar — Resenha FC" },
      {
        property: "og:description",
        content: "Acesse o sistema de gestão da pelada do Resenha FC Futebol Clube.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app/principal", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success("Login realizado com sucesso.");
    navigate({ to: "/app/principal", replace: true });
  }

  return (
    <div className="surface-navy flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandMark size="lg" withName={false} />
          <div>
            <h1 className="text-title text-navy-foreground">{CLUB.shortName}</h1>
            <p className="text-[11px] uppercase tracking-[0.22em] text-navy-foreground/70">
              {CLUB.tagline}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">Usuário</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="seu@email.com"
              className="h-12 rounded-xl"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="h-12 rounded-xl"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={submitting}>
            {submitting ? <Loader2 className="size-5 animate-spin" /> : "Entrar"}
          </Button>

          <div className="flex flex-col gap-2 pt-1 text-center">
            <Link to="/primeiro-acesso" className="text-sm font-semibold text-blue hover:underline">
              Primeiro acesso
            </Link>
            <Link to="/recuperar-senha" className="text-sm text-muted-foreground hover:underline">
              Esqueci minha senha
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
