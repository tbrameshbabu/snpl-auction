import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestOrigin } from '@/lib/api/request'
import { safeRedirectPath } from '@/lib/auth/redirect'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))
  const origin = requestOrigin(request)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Session cookies were written to the request cookie store by
      // createClient(); NextResponse.redirect forwards them to the browser.
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_code_error`)
}
