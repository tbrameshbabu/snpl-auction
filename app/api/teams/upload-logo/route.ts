import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { unwrap, unwrapRequired } from '@/lib/api/db'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseFormData, parseUuid } from '@/lib/api/request'
import { requireImageFile } from '@/lib/api/uploads'

const BUCKET = 'team-logos'

// Objects live under <team id>/; storage RLS only lets the team owner write there.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)
    const formData = await parseFormData(request)
    const rawTeamId = formData.get('team_id')
    if (typeof rawTeamId !== 'string') {
      throw new ApiError(400, 'Missing team_id')
    }
    const teamId = parseUuid(rawTeamId, 'team_id')
    const { file, extension } = requireImageFile(formData.get('file'), BUCKET)

    const team = unwrapRequired(
      await supabase.from('teams').select('id, owner_id').eq('id', teamId).maybeSingle(),
      'Team not found'
    )
    if (team.owner_id !== user.id) {
      throw new ApiError(403, 'You do not own this team')
    }

    const path = `${teamId}/${Date.now()}.${extension}`
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error || !data) {
      console.error('Team logo upload failed', error)
      throw new ApiError(500, 'Failed to upload logo')
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    unwrap(await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', teamId))

    return NextResponse.json({ logo_url: publicUrl })
  } catch (error) {
    return handleRouteError(error)
  }
}
