import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api/auth'
import { ApiError, handleRouteError } from '@/lib/api/errors'
import { parseFormData } from '@/lib/api/request'
import { requireImageFile } from '@/lib/api/uploads'

const BUCKET = 'player-profiles'

// Objects live under <user id>/; storage RLS only lets that user write there.
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const user = await requireUser(supabase)
    const formData = await parseFormData(request)
    const { file, extension } = requireImageFile(formData.get('file'), BUCKET)

    const path = `${user.id}/${Date.now()}.${extension}`
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
    if (error || !data) {
      console.error('Profile image upload failed', error)
      throw new ApiError(500, 'Failed to upload image')
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl, path: data.path, message: 'Image uploaded successfully' })
  } catch (error) {
    return handleRouteError(error)
  }
}
