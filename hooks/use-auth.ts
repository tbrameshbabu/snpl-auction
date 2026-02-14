'use client'

import { useEffect, useState } from 'react'
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

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setState({ user: null, role: null, loading: false })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserRole(session.user.id)
      } else {
        setState({ user: null, role: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user role:', error)
      setState({ user: null, role: null, loading: false })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    setState({
      user: user,
      role: data?.role as UserRole,
      loading: false,
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setState({ user: null, role: null, loading: false })
  }

  return {
    ...state,
    signOut,
  }
}
