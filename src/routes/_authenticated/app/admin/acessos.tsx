import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import {
  createPlayerAccess,
  listPlayerAccess,
  resetPlayerPassword,
  revokePlayerAccess,
  type PlayerAccess,
} from "@/lib/admin-access.functions";

export const Route = createFileRoute("/_authenticated/app/admin/acessos")({
  head: () => ({
    meta: [
      { title: "Acessos dos jogadores | Resenha FC" },
      {
        name: "description",
        content: "Crie e gerencie o acesso dos jogadores da pelada do Resenha FC.",
      },
      { property: "og:title", content: "Acessos dos jogadores | Resenha FC" },
      {
        property: "og:description",
        content: "Crie e gerencie o acesso dos jogadores da pelada do Resenha FC.",
      },
    ],
  }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/app/principal" });
  },
  component: AdminAccessPage,
});

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Não foi possível concluir a ação. Tente novamente.";
}

function AdminAccessPage() {
  const load = useServerFn(listPlayerAccess);
  const create = useServerFn(createPlayerAccess);
  const reset = useServerFn(resetPlayerPassword);
  const revoke = useServerFn(revokePlayerAccess);

  const [rows, setRows] = useState<PlayerAccess[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetValues, setResetValues] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await load({});
      setRows(data);
    } catch (error) {
      setLoadError(errorMessage(error));
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!selected) {
      toast.error("Escolha o jogador que vai receber o acesso.");
      return;
    }
    setWorking(true);
    try {
      await create({ data: { playerId: selected, email, password } });
      toast.success("Acesso criado. Envie o e-mail e a senha para o jogador.");
      setSelected("");
      setEmail("");
      setPassword("");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setWorking(false);
    }
  }

  async function handleReset(playerId: string) {
    const newPassword = resetValues[playerId] ?? "";
    setWorking(true);
    try {
      await reset({ data: { playerId, password: newPassword } });
      toast.success("Senha atualizada.");
      setResetValues((current) => ({ ...current, [playerId]: "" }));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setWorking(false);
    }
  }

  async function handleRevoke(playerId: string) {
    if (!window.confirm("Remover o acesso deste jogador?")) return;
    setWorking(true);
    try {
      await revoke({ data: { playerId } });
      toast.success("Acesso removido.");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setWorking(false);
    }
  }

  const withoutAccess = (rows ?? []).filter((row) => !row.hasAccess);
  const withAccess = (rows ?? []).filter((row) => row.hasAccess);

  return (
    <AppLayout title="Acessos" subtitle="Crie o login dos jogadores da pelada">
      {loadError ? (
        <ErrorState title={loadError} actionLabel="Tentar novamente" onAction={() => void refresh()} />
      ) : !rows ? (
        <LoadingState label="Carregando jogadores..." />
      ) : (
        <div className="grid gap-5">
          <SectionCard title="Criar acesso" icon={UserPlus}>
            <form onSubmit={handleCreate} className="grid gap-3 sm:max-w-lg">
              <label className="grid gap-1 text-sm font-medium text-navy">
                Jogador
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                >
                  <option value="">Selecione o jogador</option>
                  {withoutAccess.map((row) => (
                    <option key={row.playerId} value={row.playerId}>
                      {row.name}
                      {row.nickname ? ` (${row.nickname})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-navy">
                E-mail
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jogador@email.com"
                  required
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-navy">
                Senha inicial
                <Input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  required
                />
              </label>
              <p className="text-meta">
                O jogador entra com esse e-mail e senha e já vê a área Meu jogo. Ele não recebe
                poderes de administrador.
              </p>
              <Button disabled={working}>Criar acesso</Button>
            </form>
          </SectionCard>

          <SectionCard title="Jogadores com acesso" icon={KeyRound}>
            {withAccess.length ? (
              <div className="grid gap-3">
                {withAccess.map((row) => (
                  <div
                    key={row.playerId}
                    className="grid gap-2 border-b border-border pb-3 last:border-0 sm:grid-cols-[1fr_auto] sm:items-end"
                  >
                    <div>
                      <p className="font-semibold text-navy">{row.name}</p>
                      <p className="text-meta">{row.email ?? "E-mail não disponível"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        className="w-44"
                        type="text"
                        placeholder="Nova senha"
                        value={resetValues[row.playerId] ?? ""}
                        onChange={(event) =>
                          setResetValues((current) => ({
                            ...current,
                            [row.playerId]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={working}
                        onClick={() => void handleReset(row.playerId)}
                      >
                        Trocar senha
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={working}
                        onClick={() => void handleRevoke(row.playerId)}
                      >
                        Remover acesso
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-meta">Nenhum jogador tem acesso ainda.</p>
            )}
          </SectionCard>
        </div>
      )}
    </AppLayout>
  );
}
