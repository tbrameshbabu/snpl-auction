import { z } from 'zod'

export const teamRegistrationSchema = z.object({
  tournament_id: z.string().uuid(),
  name: z.string().min(3, 'Team name must be at least 3 characters').max(50),
  short_name: z.string().min(2, 'Short name must be 2-3 characters').max(3),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (use hex color)'),
})

export const teamInterestSchema = z.object({
  tournament_id: z.string().uuid(),
  status: z.enum(['interested', 'withdrawn']),
})

export type TeamRegistration = z.infer<typeof teamRegistrationSchema>
export type TeamInterest = z.infer<typeof teamInterestSchema>
