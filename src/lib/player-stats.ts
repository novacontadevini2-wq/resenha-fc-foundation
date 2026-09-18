import type { Match, MatchAssist, MatchGoal, Player } from "@/types";

export interface TeamPlayerRow {
  team_id: string;
  player_id: string;
}

export interface PlayerCareer {
  playerId: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals: number;
  assists: number;
  points: number;
  winRate: number;
  goalsPerMatch: number;
  participations: number;
  form: ("V" | "E" | "D")[];
  level: number;
  levelProgress: number;
  xp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  goal: number;
}

const XP_PER_LEVEL = 100;

export function buildCareer(
  playerId: string,
  matches: Match[],
  teamPlayers: TeamPlayerRow[],
  goals: MatchGoal[],
  assists: MatchAssist[],
): PlayerCareer {
  const myTeams = new Set(
    teamPlayers.filter((row) => row.player_id === playerId).map((row) => row.team_id),
  );

  const finished = matches
    .filter((match) => match.status === "finished")
    .filter((match) => myTeams.has(match.team_a_id) || myTeams.has(match.team_b_id))
    .sort((a, b) => (a.finished_at ?? a.scheduled_at ?? "").localeCompare(b.finished_at ?? b.scheduled_at ?? ""));

  let wins = 0;
  let drawsCount = 0;
  let losses = 0;
  const form: ("V" | "E" | "D")[] = [];

  for (const match of finished) {
    const mine = myTeams.has(match.team_a_id) ? match.score_a : match.score_b;
    const other = myTeams.has(match.team_a_id) ? match.score_b : match.score_a;
    if (mine > other) {
      wins += 1;
      form.push("V");
    } else if (mine === other) {
      drawsCount += 1;
      form.push("E");
    } else {
      losses += 1;
      form.push("D");
    }
  }

  const finishedIds = new Set(finished.map((match) => match.id));
  const myGoals = goals.filter((goal) => goal.player_id === playerId && finishedIds.has(goal.match_id)).length;
  const myAssists = assists.filter(
    (assist) => assist.player_id === playerId && finishedIds.has(assist.match_id),
  ).length;

  const played = finished.length;
  const points = wins * 3 + drawsCount;
  const xp = played * 10 + myGoals * 15 + myAssists * 10 + wins * 8;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  return {
    playerId,
    matches: played,
    wins,
    draws: drawsCount,
    losses,
    goals: myGoals,
    assists: myAssists,
    points,
    winRate: played ? Math.round((wins / played) * 100) : 0,
    goalsPerMatch: played ? Number((myGoals / played).toFixed(2)) : 0,
    participations: myGoals + myAssists,
    form: form.slice(-5).reverse(),
    level,
    levelProgress: Math.round(((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100),
    xp,
  };
}

export function buildAchievements(career: PlayerCareer, hatTricks: number, cleanSheets: number): Achievement[] {
  const make = (id: string, title: string, description: string, progress: number, goal: number): Achievement => ({
    id,
    title,
    description,
    progress: Math.min(progress, goal),
    goal,
    unlocked: progress >= goal,
  });

  return [
    make("estreia", "Estreia", "Jogue sua primeira partida", career.matches, 1),
    make("primeiro-gol", "Primeiro gol", "Balance as redes uma vez", career.goals, 1),
    make("garcom", "Garçom", "Dê 5 assistências", career.assists, 5),
    make("artilheiro", "Artilheiro nato", "Marque 10 gols", career.goals, 10),
    make("hat-trick", "Hat-trick", "Marque 3 gols em uma partida", hatTricks, 1),
    make("muralha", "Muralha", "Termine 3 jogos sem sofrer gol", cleanSheets, 3),
    make("veterano", "Veterano", "Dispute 20 partidas", career.matches, 20),
    make("vencedor", "Vencedor", "Conquiste 10 vitórias", career.wins, 10),
    make("lenda", "Lenda do Resenha", "Chegue a 50 participações em gols", career.participations, 50),
  ];
}

export function rankOf(playerId: string, table: { playerId: string; value: number }[]) {
  const ordered = [...table].sort((a, b) => b.value - a.value);
  const index = ordered.findIndex((row) => row.playerId === playerId);
  return index >= 0 && ordered[index]!.value > 0
    ? { position: index + 1, total: ordered.filter((row) => row.value > 0).length }
    : null;
}

export function playerLabel(player: Pick<Player, "name" | "nickname">) {
  return player.nickname?.trim() ? player.nickname : player.name;
}
