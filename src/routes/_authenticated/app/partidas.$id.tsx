import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CirclePlay, Flag, Goal, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/feedback/states";
import { AppLayout } from "@/components/layout/AppLayout";
import { MatchStatusBadge } from "@/components/matches/MatchStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Match, MatchAssist, MatchGoal, MatchGoalkeeperStat, MatchTeam, Round } from "@/types";

interface TeamPlayer { team_id: string; player_id: string; player_name_snapshot: string; photo_url_snapshot: string | null; }

export const Route = createFileRoute("/_authenticated/app/partidas/$id")({
  head: () => ({ meta: [{ title: "Detalhe da partida | Resenha FC" }] }),
  component: MatchDetailsPage,
});

function MatchDetailsPage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [teams, setTeams] = useState<MatchTeam[]>([]);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [assists, setAssists] = useState<MatchAssist[]>([]);
  const [goalkeeperStats, setGoalkeeperStats] = useState<MatchGoalkeeperStat[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedAssist, setSelectedAssist] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [minute, setMinute] = useState("");
  const [editingGoal, setEditingGoal] = useState<MatchGoal | null>(null);
  const [scoreA, setScoreA] = useState("0");
  const [scoreB, setScoreB] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [working, setWorking] = useState(false);
  const [keeperPlayer, setKeeperPlayer] = useState("");
  const [keeperTeam, setKeeperTeam] = useState("");
  const [goalsConceded, setGoalsConceded] = useState("");
  const [saves, setSaves] = useState("");
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editScheduledAt, setEditScheduledAt] = useState("");
  const [editNotes, setEditNotes] = useState("");

  async function load() {
    setLoading(true);
    const { data: matchData, error: matchError } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
    if (matchError || !matchData) { setError(true); setLoading(false); return; }
    const currentMatch = matchData as Match;
    const [{ data: roundData }, { data: teamData }, { data: goalData }, { data: assistData }, { data: keeperData }] = await Promise.all([
      supabase.from("rounds").select("*").eq("id", currentMatch.round_id).maybeSingle(),
      supabase.from("draw_teams").select("id, draw_id, team_number, total_rating").eq("draw_id", currentMatch.draw_id).order("team_number"),
      supabase.from("match_goals").select("*").eq("match_id", id).order("created_at"),
      supabase.from("match_assists").select("*").eq("match_id", id),
      supabase.from("goalkeeper_stats").select("*").eq("match_id", id),
    ]);
    const nextTeams = (teamData ?? []) as MatchTeam[];
    const { data: snapshotData } = await supabase.from("draw_team_players").select("team_id, player_id, player_name_snapshot, photo_url_snapshot").in("team_id", nextTeams.map((team) => team.id));
    const snapshotPlayers = (snapshotData ?? []) as TeamPlayer[];
    setMatch(currentMatch); setRound((roundData ?? null) as Round | null); setTeams(nextTeams); setGoals((goalData ?? []) as MatchGoal[]); setAssists((assistData ?? []) as MatchAssist[]); setGoalkeeperStats((keeperData ?? []) as MatchGoalkeeperStat[]); setTeamPlayers(snapshotPlayers); setScoreA(String(currentMatch.score_a)); setScoreB(String(currentMatch.score_b)); setEditTeamA(currentMatch.team_a_id); setEditTeamB(currentMatch.team_b_id); setEditScheduledAt(currentMatch.scheduled_at ? new Date(currentMatch.scheduled_at).toISOString().slice(0, 16) : ""); setEditNotes(currentMatch.notes ?? ""); setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  const teamA = teams.find((team) => team.id === match?.team_a_id);
  const teamB = teams.find((team) => team.id === match?.team_b_id);
  const availablePlayers = useMemo(() => teamPlayers.filter((player) => player.team_id === selectedTeam), [selectedTeam, teamPlayers]);
  const playerName = (playerId: string) => teamPlayers.find((player) => player.player_id === playerId)?.player_name_snapshot ?? "Jogador";
  const teamName = (teamId: string) => `Time ${teams.find((team) => team.id === teamId)?.team_number ?? "?"}`;

  async function callAction(action: "start_match" | "finish_match" | "cancel_match") {
    if (!match) return;
    if (action === "cancel_match" && !window.confirm("Tem certeza que deseja cancelar esta partida?")) return;
    setWorking(true);
    const { error: actionError } = await supabase.rpc(action, { p_match_id: match.id });
    setWorking(false);
    if (actionError) toast.error(action === "finish_match" ? "Existem gols registrados que não correspondem ao placar. Corrija antes de finalizar a partida." : "Não foi possível atualizar a partida.");
    else { toast.success(action === "start_match" ? "Partida iniciada." : action === "finish_match" ? "Partida finalizada." : "Partida cancelada."); await load(); }
  }

  async function saveScore(event: React.FormEvent) {
    event.preventDefault();
    const nextA = Number(scoreA); const nextB = Number(scoreB);
    if (!Number.isInteger(nextA) || !Number.isInteger(nextB) || nextA < 0 || nextB < 0) { toast.error("Informe placares inteiros maiores ou iguais a zero."); return; }
    setWorking(true); const { error: scoreError } = await supabase.rpc("set_match_score", { p_match_id: id, p_score_a: nextA, p_score_b: nextB }); setWorking(false);
    if (scoreError) toast.error("Não foi possível atualizar o placar."); else { toast.success("Placar atualizado."); await load(); }
  }

  async function saveMatchDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!match || editTeamA === editTeamB || !editTeamA || !editTeamB) {
      toast.error("Selecione duas equipes diferentes.");
      return;
    }
    setWorking(true);
    const { error: updateError } = await supabase.rpc("update_match_details", {
      p_match_id: match.id,
      p_team_a_id: editTeamA,
      p_team_b_id: editTeamB,
      p_scheduled_at: editScheduledAt ? new Date(editScheduledAt).toISOString() : null,
      p_notes: editNotes || null,
    });
    setWorking(false);
    if (updateError) toast.error("Não foi possível atualizar os dados da partida.");
    else { toast.success("Partida atualizada."); await load(); }
  }

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    const playerTeamId = teamPlayers.find((player) => player.player_id === selectedPlayer)?.team_id ?? "";
    if (!selectedPlayer || !playerTeamId || (minute && (!Number.isInteger(Number(minute)) || Number(minute) < 0))) { toast.error("Selecione um jogador e informe um minuto válido."); return; }
    setWorking(true);
    const assistPlayerId = selectedAssist && selectedAssist !== "none" ? selectedAssist : null;
    const action = editingGoal ? supabase.rpc("update_match_goal_with_assist", { p_goal_id: editingGoal.id, p_player_id: selectedPlayer, p_team_id: playerTeamId, ...(minute ? { p_minute: Number(minute) } : {}), ...(assistPlayerId ? { p_assist_player_id: assistPlayerId } : {}) }) : supabase.rpc("register_match_goal_with_assist", { p_match_id: id, p_player_id: selectedPlayer, p_team_id: playerTeamId, ...(minute ? { p_minute: Number(minute) } : {}), ...(assistPlayerId ? { p_assist_player_id: assistPlayerId } : {}) });
    const { error: goalError } = await action; setWorking(false);
    if (goalError) toast.error("Não foi possível salvar o gol. Confirme o jogador e a equipe."); else { toast.success(editingGoal ? "Gol atualizado com sucesso." : "Gol registrado."); resetGoalForm(); await load(); }
  }

  async function deleteGoal(goal: MatchGoal) {
    if (!window.confirm("Deseja remover este gol?")) return;
    setWorking(true); const { error: deleteError } = await supabase.rpc("delete_match_goal", { p_goal_id: goal.id }); setWorking(false);
    if (deleteError) toast.error("Não foi possível remover o gol."); else { toast.success("Gol removido."); await load(); }
  }

  async function saveGoalkeeper(event: React.FormEvent) {
    event.preventDefault();
    const conceded = Number(goalsConceded);
    const keeper = teamPlayers.find((player) => player.player_id === keeperPlayer);
    if (!keeper || !Number.isInteger(conceded) || conceded < 0 || (saves && (!Number.isInteger(Number(saves)) || Number(saves) < 0))) { toast.error("Informe um goleiro e valores válidos."); return; }
    setWorking(true); const { error: keeperError } = await supabase.rpc("upsert_goalkeeper_stats", { p_match_id: id, p_player_id: keeper.player_id, p_team_id: keeper.team_id, p_goals_conceded: conceded, ...(saves ? { p_saves: Number(saves) } : {}) }); setWorking(false);
    if (keeperError) toast.error("Não foi possível salvar o desempenho do goleiro."); else { toast.success("Desempenho do goleiro salvo."); setKeeperPlayer(""); setGoalsConceded(""); setSaves(""); await load(); }
  }

  function editGoal(goal: MatchGoal) { setEditingGoal(goal); setSelectedTeam(goal.team_id); setSelectedPlayer(goal.player_id); setSelectedAssist(assists.find((assist) => assist.goal_id === goal.id)?.player_id ?? ""); setMinute(goal.minute?.toString() ?? ""); }
  function resetGoalForm() { setEditingGoal(null); setSelectedTeam(""); setSelectedPlayer(""); setSelectedAssist(""); setMinute(""); }

  if (loading) return <AppLayout title="Partida"><LoadingState label="Carregando partida..." /></AppLayout>;
  if (error || !match) return <AppLayout title="Partida"><ErrorState title="Não foi possível carregar a partida." /></AppLayout>;
  const canEdit = isAdmin && match.status === "in_progress";
  return <AppLayout title="Detalhe da partida" subtitle={round ? `Rodada de ${new Date(`${round.scheduled_date}T12:00:00`).toLocaleDateString("pt-BR")}` : "Resenha FC"}>
    <Button variant="ghost" asChild className="mb-4"><Link to="/app/partidas"><ArrowLeft /> Voltar para partidas</Link></Button>
    {isAdmin && match.status !== "finished" && match.status !== "cancelled" ? <SectionCard title="Editar partida" icon={Flag} className="mb-5"><form onSubmit={saveMatchDetails} className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-navy">Equipe A<Select value={editTeamA} onValueChange={setEditTeamA}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{teamName(team.id)}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Equipe B<Select value={editTeamB} onValueChange={setEditTeamB}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{teams.filter((team) => team.id !== editTeamA).map((team) => <SelectItem key={team.id} value={team.id}>{teamName(team.id)}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Data e horário<Input type="datetime-local" value={editScheduledAt} onChange={(event) => setEditScheduledAt(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium text-navy">Observações<Input value={editNotes} onChange={(event) => setEditNotes(event.target.value)} /></label><Button disabled={working}>Salvar alterações</Button></form></SectionCard> : null}
    <section className="card-surface mb-5 p-5 text-center"><div className="flex items-center justify-between gap-3 text-left"><div><p className="text-meta">{match.scheduled_at ? new Date(match.scheduled_at).toLocaleString("pt-BR") : round?.start_time?.slice(0, 5) ?? "Horário não informado"}</p><p className="text-meta">{round?.location_name ?? "Rodada"}</p></div><MatchStatusBadge status={match.status} /></div><div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className="font-display text-2xl font-bold text-navy">{teamName(match.team_a_id)}</div><div className="font-display text-5xl font-bold text-navy"><span>{match.status === "scheduled" || match.status === "cancelled" ? "-" : match.score_a}</span><span className="mx-2 text-2xl text-orange">x</span><span>{match.status === "scheduled" || match.status === "cancelled" ? "-" : match.score_b}</span></div><div className="font-display text-2xl font-bold text-navy">{teamName(match.team_b_id)}</div></div>{match.notes ? <p className="text-meta mt-5">{match.notes}</p> : null}<div className="mt-6 flex flex-wrap justify-center gap-2">{isAdmin && match.status === "scheduled" ? <Button onClick={() => void callAction("start_match")} disabled={working}><CirclePlay /> Iniciar partida</Button> : null}{isAdmin && match.status === "in_progress" ? <Button variant="outline" onClick={() => void callAction("finish_match")} disabled={working}><Flag /> Finalizar partida</Button> : null}{isAdmin && ["scheduled", "in_progress"].includes(match.status) ? <Button variant="ghost" onClick={() => void callAction("cancel_match")} disabled={working}><XCircle /> Cancelar partida</Button> : null}</div></section>
    <div className="grid gap-5 sm:grid-cols-2"><SectionCard title="Equipes participantes" icon={Goal}><div className="grid gap-4">{[teamA, teamB].map((team) => <div key={team?.id}><h3 className="font-display text-lg font-bold text-navy">{team ? teamName(team.id) : "Equipe"}</h3><div className="mt-2 grid gap-1 text-sm text-muted-foreground">{teamPlayers.filter((player) => player.team_id === team?.id).map((player) => <p key={player.player_id}>{player.player_name_snapshot}</p>)}</div></div>)}</div></SectionCard><SectionCard title="Gols" icon={Goal}><div className="grid gap-2">{goals.length ? goals.map((goal) => <div key={goal.id} className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm"><span>{goal.minute != null ? `${goal.minute}' ` : ""}{playerName(goal.player_id)} · {teamName(goal.team_id)}</span>{canEdit ? <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => editGoal(goal)}>Corrigir</Button><Button size="sm" variant="ghost" onClick={() => void deleteGoal(goal)}>Remover</Button></span> : null}</div>) : <p className="text-meta">Nenhum gol registrado.</p>}</div></SectionCard></div>
    {canEdit ? <div className="mt-5 grid gap-5 sm:grid-cols-2"><SectionCard title={editingGoal ? "Corrigir gol" : "Registrar gol"} icon={Goal}><form onSubmit={saveGoal} className="grid gap-3"><label className="grid gap-1 text-sm font-medium text-navy">Equipe<Select value={selectedTeam} onValueChange={(value) => { setSelectedTeam(value); setSelectedPlayer(""); setSelectedAssist(""); }}><SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger><SelectContent><SelectItem value={match.team_a_id}>{teamName(match.team_a_id)}</SelectItem><SelectItem value={match.team_b_id}>{teamName(match.team_b_id)}</SelectItem></SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Jogador<Select value={selectedPlayer} onValueChange={setSelectedPlayer} disabled={!selectedTeam}><SelectTrigger><SelectValue placeholder="Selecione o jogador" /></SelectTrigger><SelectContent>{availablePlayers.map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.player_name_snapshot}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Assistência (opcional)<Select value={selectedAssist} onValueChange={setSelectedAssist} disabled={!selectedPlayer}><SelectTrigger><SelectValue placeholder="Sem assistência" /></SelectTrigger><SelectContent><SelectItem value="none">Sem assistência</SelectItem>{availablePlayers.filter((player) => player.player_id !== selectedPlayer).map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.player_name_snapshot}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Minuto (opcional)<Input type="number" min="0" step="1" value={minute} onChange={(event) => setMinute(event.target.value)} /></label><div className="flex gap-2"><Button disabled={working}>{editingGoal ? "Salvar correção" : "Registrar gol"}</Button>{editingGoal ? <Button type="button" variant="ghost" onClick={resetGoalForm}>Cancelar</Button> : null}</div></form></SectionCard><SectionCard title="Corrigir placar" icon={Flag}><form onSubmit={saveScore} className="grid gap-3"><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-medium text-navy">{teamName(match.team_a_id)}<Input type="number" min="0" step="1" value={scoreA} onChange={(event) => setScoreA(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium text-navy">{teamName(match.team_b_id)}<Input type="number" min="0" step="1" value={scoreB} onChange={(event) => setScoreB(event.target.value)} /></label></div><p className="text-meta">O placar não pode ficar abaixo da quantidade de gols registrados.</p><Button variant="outline" disabled={working}>Salvar placar</Button></form></SectionCard></div> : null}
    {isAdmin && match.status === "finished" ? <SectionCard title="Desempenho do goleiro" icon={Goal} className="mt-5"><form onSubmit={saveGoalkeeper} className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium text-navy">Goleiro<Select value={keeperPlayer} onValueChange={(value) => { setKeeperPlayer(value); setKeeperTeam(teamPlayers.find((player) => player.player_id === value)?.team_id ?? ""); }}><SelectTrigger><SelectValue placeholder="Selecione o goleiro" /></SelectTrigger><SelectContent>{teamPlayers.map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.player_name_snapshot} · {teamName(player.team_id)}</SelectItem>)}</SelectContent></Select></label><label className="grid gap-1 text-sm font-medium text-navy">Gols sofridos<Input type="number" min="0" step="1" value={goalsConceded} onChange={(event) => setGoalsConceded(event.target.value)} /></label><label className="grid gap-1 text-sm font-medium text-navy">Defesas (opcional)<Input type="number" min="0" step="1" value={saves} onChange={(event) => setSaves(event.target.value)} /></label><div><Button disabled={working || !keeperTeam}>{goalkeeperStats.some((stat) => stat.player_id === keeperPlayer) ? "Atualizar desempenho" : "Salvar desempenho"}</Button></div></form></SectionCard> : null}
  </AppLayout>;
}
