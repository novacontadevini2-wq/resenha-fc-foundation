import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { AuditLog } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/auditoria")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const { data: admin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!admin) throw redirect({ to: "/app/principal" });
  },
  component: AuditPage,
});
function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (loadError) setError(true);
      else setLogs((data ?? []) as AuditLog[]);
      setLoading(false);
    }
    void load();
  }, []);
  const visible = logs.filter((log) =>
    `${log.action} ${log.entity_type} ${log.entity_id ?? ""}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <AppLayout title="Auditoria" subtitle="Histórico de operações administrativas.">
      <SectionCard title="Filtros" icon={ClipboardCheck} className="mb-5">
        <Input
          placeholder="Filtrar por ação ou entidade"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </SectionCard>
      {loading ? (
        <LoadingState label="Carregando auditoria..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar os dados." />
      ) : visible.length === 0 ? (
        <EmptyState title="Nenhuma alteração administrativa registrada." />
      ) : (
        <SectionCard title="Registros" icon={ClipboardCheck}>
          <div className="grid gap-2">
            {visible.map((log) => (
              <article key={log.id} className="border-b border-border py-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong className="text-navy">{log.action}</strong>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-meta mt-1">
                  Entidade: {log.entity_type}
                  {log.entity_id ? ` · ${log.entity_id}` : ""}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
    </AppLayout>
  );
}
