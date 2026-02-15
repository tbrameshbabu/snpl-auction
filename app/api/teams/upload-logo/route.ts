import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const teamId = formData.get('team_id') as string | null

    if (!file || !teamId) {
      return NextResponse.json(
        { error: 'Missing file or team_id' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
        { status: 400 }
      )
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB.' },
        { status: 400 }
      )
    }

    // Verify team ownership
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, owner_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not own this team' },
        { status: 403 }
      )
    }

    // Upload to Supabase Storage using admin client (bypasses RLS)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const adminClient = createAdminClient()

    const ext = file.name.split('.').pop() || 'png'
    const filePath = `${user.id}/${teamId}_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from('team-logos')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get the public URL
    const { data: publicUrlData } = adminClient.storage
      .from('team-logos')
      .getPublicUrl(filePath)

    const logoUrl = publicUrlData.publicUrl

    // Update the team record
    const { error: updateError } = await adminClient
      .from('teams')
      .update({ logo_url: logoUrl })
      .eq('id', teamId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'File uploaded but failed to update team' },
        { status: 500 }
      )
    }

    return NextResponse.json({ logo_url: logoUrl })
  } catch (error: any) {
    console.error('Upload logo error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
