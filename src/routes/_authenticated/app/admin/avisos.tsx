import { createFileRoute, redirect } from "@tanstack/react-router";
import { Megaphone, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { Announcement } from "@/types";

export const Route = createFileRoute("/_authenticated/app/admin/avisos")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: admin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (!admin) throw redirect({ to: "/app/principal" });
  },
  head: () => ({ meta: [{ title: "Avisos | Resenha FC" }] }),
  component: AnnouncementsAdminPage,
});
function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (loadError) setError(true);
    else setAnnouncements((data ?? []) as Announcement[]);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  async function createAnnouncement(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Informe título e conteúdo do aviso.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error: saveError } = await supabase
      .from("announcements")
      .insert({ title: title.trim(), content: content.trim(), created_by: userData.user?.id });
    setSaving(false);
    if (saveError) toast.error("Não foi possível criar o aviso.");
    else {
      toast.success("Aviso criado como rascunho.");
      setTitle("");
      setContent("");
      await load();
    }
  }
  async function changeStatus(announcement: Announcement) {
    if (announcement.status === "published") {
      const { error: actionError } = await supabase.rpc("unpublish_announcement", {
        p_announcement_id: announcement.id,
      });
      if (actionError) toast.error("Não foi possível despublicar o aviso.");
      else {
        toast.success("Aviso despublicado.");
        await load();
      }
      return;
    }
    const { error: actionError } = await supabase.rpc("publish_announcement", {
      p_announcement_id: announcement.id,
    });
    if (actionError) toast.error("Não foi possível publicar o aviso.");
    else {
      toast.success("Aviso publicado.");
      await load();
    }
  }
  async function editAnnouncement(announcement: Announcement) {
    const nextTitle = window.prompt("Título do aviso", announcement.title)?.trim();
    if (!nextTitle || nextTitle === announcement.title) return;
    const { error: updateError } = await supabase
      .from("announcements")
      .update({ title: nextTitle })
      .eq("id", announcement.id);
    if (updateError) toast.error("Não foi possível editar o aviso.");
    else {
      toast.success("Aviso atualizado.");
      await load();
    }
  }
  return (
    <AppLayout title="Avisos" subtitle="Comunique informações importantes do clube.">
      <SectionCard title="Novo aviso" icon={Plus} className="mb-5">
        <form onSubmit={createAnnouncement} className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-navy">
            Título
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-navy">
            Mensagem
            <Input value={content} onChange={(event) => setContent(event.target.value)} required />
          </label>
          <Button disabled={saving}>{saving ? "Salvando..." : "Criar rascunho"}</Button>
        </form>
      </SectionCard>
      {loading ? (
        <LoadingState label="Carregando avisos..." />
      ) : error ? (
        <ErrorState title="Não foi possível carregar os avisos." onRetry={() => void load()} />
      ) : announcements.length === 0 ? (
        <EmptyState title="Nenhum aviso disponível." />
      ) : (
        <SectionCard title="Central de avisos" icon={Megaphone}>
          <div className="grid gap-3">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="card-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      {announcement.title}
                    </h2>
                    <p className="text-meta mt-1">{announcement.content}</p>
                  </div>
                  <span className="text-xs font-bold uppercase text-orange">
                    {announcement.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void editAnnouncement(announcement)}
                  >
                    Editar
                  </Button>
                  <Button size="sm" onClick={() => void changeStatus(announcement)}>
                    {announcement.status === "published" ? "Despublicar" : "Publicar"}
                  </Button>
                  {announcement.status !== "expired" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const { error: expireError } = await supabase
                          .from("announcements")
                          .update({ status: "expired" })
                          .eq("id", announcement.id);
                        if (expireError) toast.error("Não foi possível encerrar o aviso.");
                        else {
                          toast.success("Aviso encerrado.");
                          await load();
                        }
                      }}
                    >
                      Encerrar
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      )}
    </AppLayout>
  );
}
