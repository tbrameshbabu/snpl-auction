'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import { TeamLogo } from '@/components/team-logo'
import {
  Loader2,
  ArrowLeft,
  Users,
  Shield,
  Wallet,
  Calendar,
  Zap,
} from 'lucide-react'

interface Team {
  id: string
  name: string
  short_name: string
  color: string
  owner_name: string
  budget: number
  spent: number
  status: string
  created_at: string
  logo_url?: string | null
  users?: { email: string }
}

export default function TournamentTeamsPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [tournament, setTournament] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tournamentRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}`)
        const tournamentData = await tournamentRes.json()

        if (!tournamentRes.ok) {
          setError(tournamentData.error || 'Failed to load tournament')
          setLoading(false)
          return
        }

        setTournament(tournamentData.tournament)

        const teamsRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}/teams`)
        const teamsData = await teamsRes.json()

        if (teamsRes.ok) {
          setTeams(teamsData.teams || [])
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    fetchData()
  }, [tournamentId])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen p-5">
        <div className="glass rounded-xl p-6 max-w-md mx-auto mt-20">
          <p className="text-red-400 mb-4">{error || 'Tournament not found'}</p>
          <Button onClick={() => router.push('/auctioneer/tournaments')} className="w-full">
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  const slotsUsed = teams.length
  const totalSlots = tournament.num_teams
  const slotsPercent = totalSlots > 0 ? Math.round((slotsUsed / totalSlots) * 100) : 0

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.08),transparent_60%)]" />
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}`)}
              className="h-10 w-10 rounded-lg glass flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {tournament.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Registered Teams
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Slots Progress */}
      <section className="px-5 py-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-foreground">
                  Team Slots
                </span>
                <span className="text-sm font-bold text-neon">
                  {slotsUsed} / {totalSlots}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gold"
                  style={{ width: `${slotsPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Heading */}
      <div className="px-5 mb-3">
        <h2 className="text-lg font-bold text-foreground">
          Teams ({teams.length})
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Teams registered for this tournament
        </p>
      </div>

      {/* Teams List */}
      <section className="px-5 flex flex-col gap-3" aria-label="Teams">
        {teams.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              No Teams Registered
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Teams will appear here once they register for this tournament
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="glass rounded-xl p-4 flex items-center gap-3"
            >
              {/* Team Logo */}
              <TeamLogo
                logoUrl={team.logo_url}
                shortName={team.short_name || team.name.charAt(0)}
                color={team.color || '#F4A261'}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {team.name}
                  </h3>
                  {team.short_name && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gold/15 text-gold shrink-0">
                      {team.short_name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {team.users?.email || team.owner_name || 'Unknown owner'}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <Wallet className="h-3 w-3 text-gold" />
                    <span className="text-xs font-semibold text-foreground">{team.budget} pts</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="shrink-0">
                {team.status === 'withdrawn' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                    Withdrawn
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon/15 text-neon">
                    Active
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
