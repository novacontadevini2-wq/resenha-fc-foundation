import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="login-page">
      <div className="login-background" aria-hidden="true" />
      <div className="login-dots" aria-hidden="true" />

      <div className="login-card">
        <div className="login-logo-wrap">
          <div className="login-logo-badge">
            <img src="/logotipo%20resenha%20fc.png" alt={`${CLUB.fullName} - logotipo`} />
          </div>
          <div className="login-brand-name">{CLUB.shortName}</div>
          <div className="login-brand-sub">{CLUB.tagline}</div>
        </div>

        <div className="login-divider"><span>Acesso ao sistema</span></div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <Label htmlFor="email">Usuário</Label>
            <div className="login-input-wrap">
              <Mail className="login-input-icon" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <Label htmlFor="password">Senha</Label>
            <div className="login-input-wrap login-input-with-action">
              <KeyRound className="login-input-icon" aria-hidden="true" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="login-eye-button"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error ? (
            <p className="login-error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-5 animate-spin" /> : "Entrar"}
          </Button>
        </form>

        <div className="login-footer"><strong>{CLUB.shortName}</strong> - Temporada 2026</div>
      </div>
    </main>
  );
}
