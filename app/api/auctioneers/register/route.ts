import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { auctioneerRegistrationSchema } from '@/lib/validations/auctioneer'

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

    // Verify user is an auctioneer
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'auctioneer') {
      return NextResponse.json({ error: 'Only auctioneers can register' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = auctioneerRegistrationSchema.parse(body)

    // Check if auctioneer profile already exists
    const { data: existingAuctioneer } = await supabase
      .from('auctioneers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existingAuctioneer) {
      return NextResponse.json({ error: 'Auctioneer profile already exists' }, { status: 400 })
    }

    // Create auctioneer profile
    const { data: auctioneer, error: auctioneerError } = await supabase
      .from('auctioneers')
      .insert({
        user_id: user.id,
        ...validatedData,
      })
      .select()
      .single()

    if (auctioneerError) {
      return NextResponse.json({ error: auctioneerError.message }, { status: 500 })
    }

    return NextResponse.json({ auctioneer, message: 'Auctioneer registered successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
