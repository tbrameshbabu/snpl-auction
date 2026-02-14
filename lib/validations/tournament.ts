import { z } from 'zod'

export const tournamentSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  auction_date: z.string().or(z.date()),
  auction_time: z.string(),
  duration_minutes: z.number().min(30).max(480).optional(),
  num_teams: z.number().min(2, 'At least 2 teams required').max(20),
  num_players_per_team: z.number().min(4, 'At least 4 players per team').max(20),
  min_players_per_team: z.number().min(1).max(20),
  budget_per_team: z.number().min(100, 'Budget must be at least 100 points').max(10000),
  player_list_type: z.enum(['system_generated', 'custom']).default('system_generated'),
}).refine(
  (data) => data.min_players_per_team <= data.num_players_per_team,
  {
    message: 'Minimum players cannot exceed maximum players per team',
    path: ['min_players_per_team'],
  }
)

export const tournamentPlayerSchema = z.object({
  tournament_id: z.string().uuid(),
  player_id: z.string().uuid(),
  base_price: z.number().min(1, 'Base price must be at least 1 point'),
  order_index: z.number().min(0).optional(),
})

export const publishTournamentSchema = z.object({
  tournament_id: z.string().uuid(),
})

export type Tournament = z.infer<typeof tournamentSchema>
export type TournamentPlayer = z.infer<typeof tournamentPlayerSchema>
export type PublishTournament = z.infer<typeof publishTournamentSchema>
