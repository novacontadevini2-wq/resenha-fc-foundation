import { createFileRoute, redirect } from "@tanstack/react-router";
import { Save, Settings } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { supabase } from "@/integrations/supabase/client";
import type { ClubSetting } from "@/types";

const defaultSettings: Record<string, string> = {
  club_name: "Resenha FC Futebol Clube",
  arena: "",
  address: "",
  day: "",
  start_time: "",
  end_time: "",
};

export const Route = createFileRoute("/_authenticated/app/admin/configuracoes")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      throw redirect({ to: "/login" });
    }

    const { data: admin } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    if (!admin) {
      throw redirect({ to: "/app/principal" });
    }
  },
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: loadError } = await supabase.rpc("get_admin_settings");

      if (loadError) {
        setError(true);
      } else {
        const next = { ...defaultSettings };

        ((data ?? []) as ClubSetting[]).forEach((item) => {
          next[item.key] = String(item.value);
        });

        setSettings(next);
      }

      setLoading(false);
    }

    void load();
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const results = await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        supabase.rpc("update_club_settings", { p_key: key, p_value: value }),
      ),
    );

    setSaving(false);

    if (results.some((result) => result.error)) {
      toast.error("Não foi possível salvar as configurações.");
      return;
    }

    toast.success("Configurações atualizadas.");
  }

  if (loading) {
    return (
      <AppLayout title="Configurações">
        <LoadingState label="Carregando configurações..." />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Configurações">
        <ErrorState title="Não foi possível carregar os dados." />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Configurações" subtitle="Informações padrão do Resenha FC.">
      <SectionCard title="Configurações do clube" icon={Settings}>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["club_name", "Nome do clube"],
              ["arena", "Arena"],
              ["address", "Endereço"],
              ["day", "Dia padrão"],
              ["start_time", "Horário inicial"],
              ["end_time", "Horário final"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="grid gap-1 text-sm font-medium text-navy">
              {label}
              <Input
                value={settings[key] ?? ""}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
              />
            </label>
          ))}

          <div>
            <Button disabled={saving}>
              <Save />
              {saving ? "Salvando..." : "Salvar configurações"}
            </Button>
          </div>
        </form>
      </SectionCard>
    </AppLayout>
  );
}
