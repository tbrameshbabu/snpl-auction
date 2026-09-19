import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseJsonBody, requestOrigin } from '@/lib/api/request'

// Self-service signup is limited to players and team owners. Auctioneers are
// provisioned by an operator (see supabase/migrations/20260919000000_production_hardening.sql).
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['player', 'team_owner']),
})

const LANDING_PATH = {
  player: '/player/register',
  team_owner: '/team-owner/dashboard',
} as const

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { email, password, role } = await parseJsonBody(request, signupSchema)

    // The public.users profile row is created by the on_auth_user_created
    // database trigger from this metadata, so signup works with or without
    // email confirmation (no session is needed to write the profile).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: `${requestOrigin(request)}/auth/callback?next=${encodeURIComponent(LANDING_PATH[role])}`,
      },
    })

    if (error) {
      const status = error.status ?? 500
      throw new ApiError(status >= 500 ? 500 : status, status >= 500 ? 'Signup is temporarily unavailable' : error.message)
    }
    if (!data.user) {
      throw new ApiError(500, 'Failed to create user')
    }

    const requiresEmailConfirmation = data.session === null

    return NextResponse.json({
      user: data.user,
      role,
      requiresEmailConfirmation,
      message: requiresEmailConfirmation
        ? 'Check your email to confirm your account before signing in'
        : 'User created successfully',
    })
  } catch (error) {
    return handleRouteError(error)
  }
}
