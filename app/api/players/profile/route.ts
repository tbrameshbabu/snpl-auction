import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { playerRegistrationSchema } from '@/lib/validations/player'

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a player
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'player') {
      return NextResponse.json({ error: 'Only players can update profiles' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = playerRegistrationSchema.parse(body)

    // Check if player profile exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!existingPlayer) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Update player profile
    const { data: player, error: playerError } = await supabase
      .from('players')
      .update({
        ...validatedData,
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (playerError) {
      console.error('Player update error:', playerError)
      return NextResponse.json({ 
        error: playerError.message,
        details: playerError 
      }, { status: 500 })
    }

    return NextResponse.json({ player, message: 'Profile updated successfully' })
  } catch (error: any) {
    console.error('Player update error:', error)
    
    if (error.name === 'ZodError') {
      const errorMessages = error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ')
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errorMessages 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}
