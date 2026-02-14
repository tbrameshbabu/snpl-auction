import { z } from 'zod'

export const playerRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  role: z.enum(['batsman', 'bowler', 'all_rounder', 'wicket_keeper'], {
    required_error: 'Please select a playing role',
  }),
  batting_hand: z.enum(['right', 'left'], {
    required_error: 'Please select batting hand',
  }),
  bowling_hand: z.enum(['right', 'left'], {
    required_error: 'Please select bowling hand',
  }),
  base_points: z.number().min(50).max(500).default(100),
  matches_played: z.number().min(0).default(0),
  runs_scored: z.number().min(0).default(0),
  batting_average: z.number().min(0).max(100).optional(),
  wickets_taken: z.number().min(0).default(0),
  bowling_average: z.number().min(0).max(100).optional(),
  rating: z.number().min(0).max(10).optional(),
  profile_image_url: z.string().url().optional(),
})

export const playerInterestSchema = z.object({
  tournament_id: z.string().uuid(),
  status: z.enum(['interested', 'withdrawn']),
  bid_preference: z.number().min(0).optional(),
})

export type PlayerRegistration = z.infer<typeof playerRegistrationSchema>
export type PlayerInterest = z.infer<typeof playerInterestSchema>
