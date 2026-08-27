import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "@/types";

export const Route = createFileRoute("/_authenticated/app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações | Resenha FC" }] }),
  component: NotificationsPage,
});
function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) setError(true);
    else setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  async function markRead(notification: Notification) {
    if (notification.read_at) return;
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notification.id);
    if (updateError) toast.error("Não foi possível marcar a notificação.");
    else {
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
        ),
      );
      toast.success("Notificação marcada como lida.");
    }
  }
  async function markAllRead() {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    if (updateError) toast.error("Não foi possível marcar as notificações.");
    else {
      toast.success("Notificações marcadas como lidas.");
      await load();
    }
  }
  function openNotification(notification: Notification) {
    void markRead(notification);
    if (notification.related_entity_type === "match" && notification.related_entity_id)
      void navigate({ to: "/app/partidas/$id", params: { id: notification.related_entity_id } });
    else if (notification.related_entity_type === "tournament" && notification.related_entity_id)
      void navigate({ to: "/app/torneios/$id", params: { id: notification.related_entity_id } });
    else if (notification.related_entity_type === "round" && notification.related_entity_id)
      void navigate({ to: "/app/rodadas/$id", params: { id: notification.related_entity_id } });
  }
  return (
    <AppLayout title="Notificações" subtitle="Avisos importantes do Resenha FC.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link to="/app/principal">
            <ArrowLeft /> Voltar
          </Link>
        </Button>
        {notifications.some((notification) => !notification.read_at) ? (
          <Button variant="outline" onClick={() => void markAllRead()}>
            Marcar todas como lidas
          </Button>
        ) : null}
      </div>
      {loading ? (
        <LoadingState label="Carregando notificações..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar as informações." onRetry={() => void load()} />
      ) : notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação." />
      ) : (
        <SectionCard title="Histórico" icon={Bell}>
          <div className="grid gap-2">
            {notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => openNotification(notification)}
                className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-accent ${notification.read_at ? "border-border bg-background" : "border-orange/40 bg-orange/10"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-navy">{notification.title}</strong>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-meta mt-1">{notification.message}</p>
              </button>
            ))}
          </div>
        </SectionCard>
      )}
    </AppLayout>
  );
}
