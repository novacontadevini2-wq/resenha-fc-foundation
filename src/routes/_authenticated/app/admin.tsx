import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { ComingSoon } from "@/components/feedback/states";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app/admin")({
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
        <ComingSoon title="Painel em breve" description="A gestão de jogadores, temporadas e rodadas será disponibilizada aqui." />
      </SectionCard>
    </AppLayout>
  );
}