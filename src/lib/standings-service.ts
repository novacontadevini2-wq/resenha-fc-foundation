import type { Match, MatchTeam } from "@/types";

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function calculateStandings(matches: Match[], teams: MatchTeam[], points = { win: 3, draw: 1, loss: 0 }): StandingRow[] {
  const rows = new Map(teams.map((team) => [team.id, { teamId: team.id, teamName: `Time ${team.team_number}`, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }]));
  matches.filter((match) => match.status === "finished").forEach((match) => {
    const teamA = rows.get(match.team_a_id); const teamB = rows.get(match.team_b_id);
    if (!teamA || !teamB) return;
    teamA.played += 1; teamB.played += 1; teamA.goalsFor += match.score_a; teamA.goalsAgainst += match.score_b; teamB.goalsFor += match.score_b; teamB.goalsAgainst += match.score_a;
    if (match.score_a > match.score_b) { teamA.wins += 1; teamB.losses += 1; teamA.points += points.win; teamB.points += points.loss; } else if (match.score_b > match.score_a) { teamB.wins += 1; teamA.losses += 1; teamB.points += points.win; teamA.points += points.loss; } else { teamA.draws += 1; teamB.draws += 1; teamA.points += points.draw; teamB.points += points.draw; }
  });
  return [...rows.values()].map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst })).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || b.wins - a.wins || a.teamName.localeCompare(b.teamName));
}
