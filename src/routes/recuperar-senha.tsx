import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailQuestion } from "lucide-react";

import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Resenha FC" },
      {
        name: "description",
        content: "Inicie a recuperação de acesso ao sistema do Resenha FC Futebol Clube.",
      },
      { property: "og:title", content: "Recuperar senha — Resenha FC" },
      {
        property: "og:description",
        content: "Inicie a recuperação de acesso ao sistema do Resenha FC Futebol Clube.",
      },
    ],
  }),
  component: RecoverPasswordPage,
});

function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    // Resposta genérica: nunca revelamos se a conta existe.
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <div className="surface-navy flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandMark size="md" tone="light" />
        </div>

        <div className="card-surface space-y-4 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-accent text-navy">
              <MailQuestion className="size-6" />
            </span>
            <h1 className="text-title text-navy">Recuperar senha</h1>
          </div>

          {sent ? (
            <p className="text-meta text-center">
              Se houver um acesso vinculado a este contato, você receberá as instruções para
              redefinir a senha.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recover-email">Seu e-mail de acesso</Label>
                <Input
                  id="recover-email"
                  type="email"
                  inputMode="email"
                  className="h-12 rounded-xl"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={submitting}>
                {submitting ? <Loader2 className="size-5 animate-spin" /> : "Enviar instruções"}
              </Button>
            </form>
          )}

          <Button asChild variant="ghost" size="lg" className="h-12 w-full rounded-xl">
            <Link to="/login">Voltar para o login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
