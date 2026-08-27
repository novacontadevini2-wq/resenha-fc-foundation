import type { Match, MatchAssist, MatchGoal, MatchGoalkeeperStat, MatchTeam, Round } from "@/types";
import { calculateGoalkeeperRanking } from "@/lib/rankings-service";

export interface PlayerStats { matches: number; goals: number; assists: number; wins: number; draws: number; losses: number; pointsWon: number; pointsPossible: number; goalkeeper: ReturnType<typeof calculateGoalkeeperRanking>[number] | null; }
export interface StatsScope { seasonId?: string; tournamentId?: string; }

export function calculatePlayerStats(playerId: string, matches: Match[], goals: MatchGoal[], assists: MatchAssist[], goalkeeperStats: MatchGoalkeeperStat[], teams: MatchTeam[], playerTeamIds: string[], rounds: Round[], points = { win: 3, draw: 1, loss: 0 }, scope: StatsScope = {}): PlayerStats {
  const teamIds = new Set(playerTeamIds);
  const scopedMatches = matches.filter((match) => match.status === "finished" && (!scope.tournamentId || match.tournament_id === scope.tournamentId) && (!scope.seasonId || rounds.some((round) => round.id === match.round_id && round.season_id === scope.seasonId)) && (!scope.tournamentId || match.tournament_id === scope.tournamentId));
  const participated = scopedMatches.filter((match) => teamIds.size === 0 || teamIds.has(match.team_a_id) || teamIds.has(match.team_b_id));
  const playerMatches = participated.filter((match) => teamIds.has(match.team_a_id) || teamIds.has(match.team_b_id) || goals.some((goal) => goal.match_id === match.id && goal.player_id === playerId) || assists.some((assist) => assist.match_id === match.id && assist.player_id === playerId) || goalkeeperStats.some((stat) => stat.match_id === match.id && stat.player_id === playerId));
  let wins = 0; let draws = 0; let losses = 0;
  playerMatches.forEach((match) => { const ownA = teamIds.has(match.team_a_id); const ownScore = ownA ? match.score_a : match.score_b; const opponentScore = ownA ? match.score_b : match.score_a; if (ownScore > opponentScore) wins += 1; else if (ownScore === opponentScore) draws += 1; else losses += 1; });
  const scopedGoals = goals.filter((goal) => playerMatches.some((match) => match.id === goal.match_id) && goal.player_id === playerId); const scopedAssists = assists.filter((assist) => playerMatches.some((match) => match.id === assist.match_id) && assist.player_id === playerId); const scopedKeepers = goalkeeperStats.filter((stat) => playerMatches.some((match) => match.id === stat.match_id) && stat.player_id === playerId);
  return { matches: new Set(playerMatches.map((match) => match.id)).size, goals: scopedGoals.length, assists: scopedAssists.length, wins, draws, losses, pointsWon: wins * points.win + draws * points.draw + losses * points.loss, pointsPossible: (wins + draws + losses) * points.win, goalkeeper: scopedKeepers.length ? calculateGoalkeeperRanking(scopedKeepers, [{ id: playerId, name: "", photo_url: null }])[0] ?? null : null };
}

export function calculateAttendance(playerId: string, confirmedRoundIds: string[], eligibleRoundIds: string[]) { const confirmed = new Set(confirmedRoundIds).size; const eligible = new Set(eligibleRoundIds).size; return { confirmed, eligible, percentage: eligible ? Math.round((confirmed / eligible) * 100) : null }; }
