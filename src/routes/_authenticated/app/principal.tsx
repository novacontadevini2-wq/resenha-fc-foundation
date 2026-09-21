import { createFileRoute, Link } from "@tanstack/react-router";
import { InstallAppButton } from "@/components/InstallAppButton";
import { BarChart3, CalendarDays, Shuffle, Trophy, User, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { toast } from "sonner";

import { AppLayout } from "@/components/layout/AppLayout";
import type { DrawPlayerSnapshot } from "@/components/draws/TeamCard";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { CLUB } from "@/lib/club-config";
import { NextRoundCard } from "@/components/rounds/NextRoundCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Match, MatchAssist, MatchGoal, Player, Round } from "@/types";

export const Route = createFileRoute("/_authenticated/app/principal")({
  head: () => ({
    meta: [
      { title: "Informações | Resenha FC" },
      {
        name: "description",
        content: "Informações da próxima pelada, local, rodada e times oficiais do Resenha FC.",
      },
      { property: "og:title", content: "Informações | Resenha FC" },
      {
        property: "og:description",
        content: "Informações da próxima pelada, local, rodada e times oficiais do Resenha FC.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrincipalPage,
});

type OfficialTeam = { id: string; team_number: number };

function PrincipalPage() {
  const { user, isAdmin } = useAuth();
  const [savingPresence, setSavingPresence] = useState(false);
  const [venue, setVenue] = useState<{ name: string; address: string }>({ name: CLUB.venue.name, address: CLUB.venue.address });
  const [nextRound, setNextRound] = useState<Round | null>(null);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [officialTeams, setOfficialTeams] = useState<OfficialTeam[]>([]);
  const [officialTeamPlayers, setOfficialTeamPlayers] = useState<DrawPlayerSnapshot[]>([]);
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
      const { data: settingsData } = await supabase.from("club_settings").select("key, value");
      if (settingsData?.length) {
        const map = Object.fromEntries(settingsData.map((item) => [item.key, String(item.value ?? "")]));
        setVenue({
          name: map["arena"] || CLUB.venue.name,
          address: map["address"] || CLUB.venue.address,
        });
      }
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
      const { data: officialDraw } = await supabase
        .from("draws")
        .select("id")
        .eq("round_id", data.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (officialDraw) {
        const { data: teamData } = await supabase
          .from("draw_teams")
          .select("id, team_number")
          .eq("draw_id", officialDraw.id)
          .order("team_number");
        const nextTeams = (teamData ?? []) as OfficialTeam[];
        setOfficialTeams(nextTeams);
        if (nextTeams.length) {
          const { data: playerSnapshots } = await supabase
            .from("draw_team_players")
            .select("*")
            .in("team_id", nextTeams.map((team) => team.id));
          setOfficialTeamPlayers((playerSnapshots ?? []) as DrawPlayerSnapshot[]);
        }
      }
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
  async function confirmPresence() {
    if (!nextRound) return;
    setSavingPresence(true);
    const { error } = await supabase.rpc("set_my_round_participation", {
      p_round_id: nextRound.id,
      p_status: "confirmed",
    });
    setSavingPresence(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Presença confirmada!");
    setConfirmedCount((current) => (personal?.status === "confirmed" ? current : current + 1));
    setPersonal((current) => (current ? { ...current, status: "confirmed" } : current));
  }

  if (!isAdmin) {
    return (
      <AppLayout
        title="Informações"
        subtitle={`${CLUB.schedule.dayLabel} · ${CLUB.schedule.timeLabel}`}
      >
        <div className="grid gap-4">
          {nextRound ? (
            <div className="grid gap-3">
              <NextRoundCard
                round={nextRound}
                confirmedCount={confirmedCount}
                {...(personal?.status ? { personalStatus: personal.status } : {})}
              />
              <Button
                className="h-12 rounded-xl bg-orange text-base font-bold text-orange-foreground hover:bg-orange-strong"
                disabled={savingPresence || personal?.status === "confirmed"}
                onClick={() => void confirmPresence()}
              >
                {personal?.status === "confirmed" ? "Presença confirmada" : "Confirmar presença"}
              </Button>
            </div>
          ) : (
            <SectionCard title="Próxima resenha" icon={CalendarDays}>
              <p className="text-lg font-semibold text-navy">Nenhuma próxima rodada cadastrada.</p>
              <p className="text-meta mt-1">As próximas informações aparecerão aqui.</p>
            </SectionCard>
          )}
          <QuickLink to="/app/meu-perfil" icon={User} label="Meu jogo" />
          <SectionCard title="Local" icon={Trophy}>
            <p className="text-lg font-semibold text-navy">{venue.name}</p>
            <p className="text-meta mt-1">{venue.address}</p>
          </SectionCard>
          <section aria-labelledby="official-teams-title">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 id="official-teams-title" className="text-subtitle">Times sorteados</h2>
                <p className="text-meta mt-1">Times oficiais da próxima pelada.</p>
              </div>
            </div>
            {officialTeams.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {officialTeams.map((team) => (
                  <OfficialTeamCard
                    key={team.id}
                    teamNumber={team.team_number}
                    players={officialTeamPlayers.filter((player) => player.team_id === team.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="card-surface p-4">
                <p className="font-semibold text-navy">Times ainda não divulgados.</p>
                <p className="text-meta mt-1">O resultado oficial aparecerá aqui após a confirmação.</p>
              </div>
            )}
          </section>
          <QuickLink to="/app/rodadas" icon={CalendarDays} label="Rodadas" />
          <div className="sm:hidden">
            <InstallAppButton variant="tile" />
          </div>
        </div>
      </AppLayout>
    );
  }

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
          <p className="text-lg font-semibold text-navy">{venue.name}</p>
          <p className="text-meta mt-1">{venue.address}</p>
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
        <QuickLink to="/app/meu-perfil" icon={User} label="Meu jogo" />
        <QuickLink to="/app/jogadores" icon={Users} label="Jogadores" />
        <QuickLink to="/app/sorteio" icon={Shuffle} label="Fazer sorteio" />
        <QuickLink to="/app/torneios" icon={Trophy} label="Torneios" />
        <QuickLink to="/app/rodadas" icon={CalendarDays} label="Rodadas" />
        <QuickLink to="/app/rankings" icon={BarChart3} label="Rankings" />
        <div className="sm:hidden">
          <InstallAppButton variant="tile" />
        </div>
      </section>
    </AppLayout>
  );
}

function OfficialTeamCard({
  teamNumber,
  players,
}: {
  teamNumber: number;
  players: DrawPlayerSnapshot[];
}) {
  return (
    <article className="card-surface min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-navy">Time {teamNumber}</h3>
        <span className="text-xs font-semibold text-orange">
          {players.length} jogador{players.length === 1 ? "" : "es"}
        </span>
      </div>
      <ul className="grid gap-2">
        {players.map((player) => (
          <li key={player.player_id} className="flex min-w-0 items-center gap-3">
            <span className="size-9 shrink-0 overflow-hidden rounded-full bg-accent">
              {player.photo_url_snapshot ? (
                <img
                  src={player.photo_url_snapshot}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-xs font-bold text-navy">
                  {player.player_name_snapshot.slice(0, 2).toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
              {player.player_name_snapshot}
            </span>
            <span className="text-meta text-xs">{player.position_code_snapshot ?? ""}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/app/meu-perfil" | "/app/jogadores" | "/app/sorteio" | "/app/torneios" | "/app/rodadas" | "/app/rankings";
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
