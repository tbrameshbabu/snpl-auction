import { z } from 'zod'

export const auctioneerRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  organization: z.string().max(100).optional(),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
})

export const bidSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_player_id: z.string().uuid(),
  team_id: z.string().uuid(),
  amount: z.number().min(1, 'Bid amount must be at least 1 point'),
})

export const markSoldSchema = z.object({
  tournament_player_id: z.string().uuid(),
  team_id: z.string().uuid(),
  final_price: z.number().min(1),
})

export const markUnsoldSchema = z.object({
  tournament_player_id: z.string().uuid(),
})

export type AuctioneerRegistration = z.infer<typeof auctioneerRegistrationSchema>
export type Bid = z.infer<typeof bidSchema>
export type MarkSold = z.infer<typeof markSoldSchema>
export type MarkUnsold = z.infer<typeof markUnsoldSchema>
