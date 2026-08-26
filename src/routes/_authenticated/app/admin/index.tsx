import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CalendarDays, ShieldCheck, Swords, Trophy } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin/")({
  head: () => ({ meta: [{ title: "Administração | Resenha FC" }] }),
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw redirect({ to: "/app/principal" });
  },
  component: AdminPage,
});

function AdminPage() {
  return (
    <AppLayout title="Administração" subtitle="Configurações e gestão do clube.">
      <SectionCard title="Área administrativa" icon={ShieldCheck}>
        <div className="grid gap-3 sm:grid-cols-2"><AdminLink to="/app/admin/temporadas" icon={Trophy} label="Gerenciar temporadas" /><AdminLink to="/app/admin/rodadas" icon={CalendarDays} label="Gerenciar rodadas" /><AdminLink to="/app/partidas" icon={Swords} label="Gerenciar partidas" /></div>
      </SectionCard>
    </AppLayout>
  );
}

function AdminLink({ to, icon: Icon, label }: { to: "/app/admin/temporadas" | "/app/admin/rodadas" | "/app/partidas"; icon: typeof Trophy; label: string }) {
  return <Link to={to} className="card-surface flex items-center gap-3 p-4 font-semibold text-navy transition-transform hover:-translate-y-0.5"><span className="flex size-10 items-center justify-center rounded-xl bg-accent"><Icon className="size-5" /></span>{label}</Link>;
}