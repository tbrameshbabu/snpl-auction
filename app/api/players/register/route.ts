import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { playerRegistrationSchema } from '@/lib/validations/player'

export async function POST(request: Request) {
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
      return NextResponse.json({ error: 'Only players can register profiles' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = playerRegistrationSchema.parse(body)

    // Check if player profile already exists
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingPlayer) {
      return NextResponse.json({ error: 'Player profile already exists' }, { status: 400 })
    }

    // Create player profile
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player creation error:', playerError)
      return NextResponse.json({ 
        error: playerError.message,
        details: playerError 
      }, { status: 500 })
    }

    return NextResponse.json({ player, message: 'Player registered successfully' })
  } catch (error: any) {
    console.error('Player registration error:', error)
    
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

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (playerError) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
