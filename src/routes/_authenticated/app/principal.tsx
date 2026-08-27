import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CalendarDays, Shuffle, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { SectionCard } from "@/components/ui/section-card";
import { CLUB } from "@/lib/club-config";
import { NextRoundCard } from "@/components/rounds/NextRoundCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Match, MatchAssist, MatchGoal, Player, Round } from "@/types";

export const Route = createFileRoute("/_authenticated/app/principal")({
  head: () => ({ meta: [{ title: "Principal | Resenha FC" }] }),
  component: PrincipalPage,
});

function PrincipalPage() {
  const { user } = useAuth();
  const [nextRound, setNextRound] = useState<Round | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [personal, setPersonal] = useState<{
    player: Player;
    status: string;
    team: string | null;
    goals: number;
    assists: number;
    lastMatch: Match | null;
  } | null>(null);
  const [announcements, setAnnouncements] = useState<
    { id: string; title: string; content: string }[]
  >([]);
  useEffect(() => {
    async function loadNextRound() {
      const { data: announcementData } = await supabase
        .from("announcements")
        .select("id, title, content")
        .eq("status", "published")
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(3);
      setAnnouncements(announcementData ?? []);
      const { data } = await supabase
        .from("rounds")
        .select("*")
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .not("status", "in", "(cancelled,finished)")
        .order("scheduled_date")
        .order("start_time")
        .limit(1)
        .maybeSingle();
      if (!data) return;
      setNextRound(data as Round);
      const { count } = await supabase
        .from("round_players")
        .select("id", { count: "exact", head: true })
        .eq("round_id", data.id)
        .eq("participation_status", "confirmed");
      setConfirmedCount(count ?? 0);
      if (user) {
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (playerData) {
          const player = playerData as Player;
          const [
            { data: participation },
            { data: goals },
            { data: assists },
            { data: teams },
            { data: recentMatches },
          ] = await Promise.all([
            supabase
              .from("round_players")
              .select("participation_status")
              .eq("round_id", data.id)
              .eq("player_id", player.id)
              .maybeSingle(),
            supabase.from("match_goals").select("id").eq("player_id", player.id),
            supabase.from("match_assists").select("id").eq("player_id", player.id),
            supabase
              .from("draw_team_players")
              .select("team_id")
              .eq("player_id", player.id)
              .limit(1),
            supabase
              .from("matches")
              .select("*")
              .eq("status", "finished")
              .order("finished_at", { ascending: false })
              .limit(1),
          ]);
          const teamId = (teams ?? [])[0]?.team_id as string | undefined;
          const { data: teamData } = teamId
            ? await supabase.from("draw_teams").select("team_number").eq("id", teamId).maybeSingle()
            : { data: null };
          setPersonal({
            player,
            status: participation?.participation_status ?? "pending",
            team: teamData ? `Time ${teamData.team_number}` : null,
            goals: goals?.length ?? 0,
            assists: assists?.length ?? 0,
            lastMatch: ((recentMatches ?? [])[0] as Match | undefined) ?? null,
          });
          if (participation?.participation_status === "pending")
            void supabase.rpc("ensure_presence_reminder", { p_round_id: data.id });
        }
      }
    }
    void loadNextRound();
  }, [user]);
  return (
    <AppLayout
      title="Principal"
      subtitle={`${CLUB.schedule.dayLabel} · ${CLUB.schedule.timeLabel}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {nextRound ? (
          <NextRoundCard
            round={nextRound}
            confirmedCount={confirmedCount}
            {...(personal?.status ? { personalStatus: personal.status } : {})}
          />
        ) : (
          <SectionCard title="Próxima resenha" icon={CalendarDays}>
            <p className="text-lg font-semibold text-navy">Nenhuma próxima rodada cadastrada.</p>
            <p className="text-meta mt-1">As próximas informações aparecerão aqui.</p>
          </SectionCard>
        )}
        <SectionCard title="Local" icon={Trophy}>
          <p className="text-lg font-semibold text-navy">{CLUB.venue.name}</p>
          <p className="text-meta mt-1">{CLUB.venue.address}</p>
        </SectionCard>
      </div>
      {announcements.length ? (
        <SectionCard title="Avisos" icon={Trophy} className="mt-5">
          <div className="grid gap-3">
            {announcements.map((announcement) => (
              <article key={announcement.id}>
                <h3 className="font-display text-lg font-bold text-navy">{announcement.title}</h3>
                <p className="text-meta mt-1">{announcement.content}</p>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {personal ? (
        <SectionCard title={`Meu Resenha · ${personal.player.name}`} icon={Users} className="mt-5">
          <div className="grid gap-2 text-sm text-navy">
            <p>
              {personal.status === "confirmed"
                ? "Você vai participar"
                : personal.status === "absent"
                  ? "Você marcou ausência"
                  : "Confirme sua presença"}
            </p>
            {personal.team ? (
              <p>
                Seu time: <strong>{personal.team}</strong>
              </p>
            ) : null}
            <p>
              Seus números: <strong>{personal.goals} gols</strong> ·{" "}
              <strong>{personal.assists} assistências</strong>
            </p>
            {personal.lastMatch ? (
              <p>
                Última partida:{" "}
                <Link
                  className="font-semibold text-orange"
                  to="/app/partidas/$id"
                  params={{ id: personal.lastMatch.id }}
                >
                  ver resultado
                </Link>
              </p>
            ) : null}
          </div>
        </SectionCard>
      ) : null}
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink to="/app/jogadores" icon={Users} label="Jogadores" />
        <QuickLink to="/app/sorteio" icon={Shuffle} label="Fazer sorteio" />
        <QuickLink to="/app/torneios" icon={Trophy} label="Torneios" />
        <QuickLink to="/app/rodadas" icon={CalendarDays} label="Rodadas" />
        <QuickLink to="/app/rankings" icon={BarChart3} label="Rankings" />
      </section>
    </AppLayout>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/app/jogadores" | "/app/sorteio" | "/app/torneios" | "/app/rodadas" | "/app/rankings";
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="card-surface flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-navy">
        <Icon className="size-5" />
      </span>
      <span className="font-semibold text-navy">{label}</span>
    </Link>
  );
}
