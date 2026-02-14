import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { playerInterestSchema } from '@/lib/validations/player'

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

    // Get player ID
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { tournament_id, status, bid_preference } = playerInterestSchema.parse(body)

    // Check if interest already exists
    const { data: existingInterest } = await supabase
      .from('player_interests')
      .select('id')
      .eq('player_id', player.id)
      .eq('tournament_id', tournament_id)
      .single()

    if (existingInterest) {
      // Update existing interest
      const { data, error } = await supabase
        .from('player_interests')
        .update({ status, bid_preference })
        .eq('id', existingInterest.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ interest: data, message: 'Interest updated' })
    } else {
      // Create new interest
      const { data, error } = await supabase
        .from('player_interests')
        .insert({
          player_id: player.id,
          tournament_id,
          status,
          bid_preference,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ interest: data, message: 'Interest registered' })
    }
  } catch (error: any) {
    console.error('Player interest error:', error)
    
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

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get player ID
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player profile not found' }, { status: 404 })
    }

    // Get all player interests with tournament details
    const { data: interests, error } = await supabase
      .from('player_interests')
      .select(`
        *,
        tournaments:tournament_id (
          id,
          title,
          description,
          auction_date,
          auction_time,
          status,
          num_teams,
          budget_per_team
        )
      `)
      .eq('player_id', player.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ interests })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
