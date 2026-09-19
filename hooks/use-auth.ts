'use client'

import { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'player' | 'team_owner' | 'auctioneer' | null

interface AuthState {
  user: User | null
  role: UserRole
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  })

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    const isUserRole = (value: unknown): value is Exclude<UserRole, null> =>
      value === 'player' || value === 'team_owner' || value === 'auctioneer'
    const fetchUserRole = async (userId: string) => {
      const { data, error } = await supabase.from('users').select('role').eq('id', userId).single()
      if (cancelled) return
      if (error) { setState({ user: null, role: null, loading: false }); return }
      const { data: userData } = await supabase.auth.getUser()
      if (cancelled) return
      setState({ user: userData.user, role: isUserRole(data?.role) ? data.role : null, loading: false })
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void fetchUserRole(session.user.id)
      } else {
        setState({ user: null, role: null, loading: false })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchUserRole(session.user.id)
      } else {
        setState({ user: null, role: null, loading: false })
      }
    })

    return () => { cancelled = true; subscription.unsubscribe() }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ user: null, role: null, loading: false })
  }

  return {
    ...state,
    signOut,
  }
}
