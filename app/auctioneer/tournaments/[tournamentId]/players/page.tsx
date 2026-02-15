'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import { cn } from '@/lib/utils'
import {
  Loader2,
  ArrowLeft,
  Users,
  Trophy,
  Zap,
  Star,
  User,
} from 'lucide-react'

interface Player {
  id: string
  name: string
  role: string
  batting_hand: string
  bowling_hand: string
  base_points: number
  matches_played: number
  runs_scored: number
  wickets_taken: number
  profile_image_url?: string
  interest_status?: string
}

export default function TournamentPlayersPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<Player[]>([])
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

        const playersRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}/players`)
        const playersData = await playersRes.json()

        if (playersRes.ok) {
          setPlayers(playersData.players || [])
        }

        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    fetchData()
  }, [tournamentId])

  const getRoleBadge = (playerRole: string) => {
    const roles: Record<string, { bg: string; text: string; label: string }> = {
      batsman: { bg: 'bg-gold/15', text: 'text-gold', label: 'Batsman' },
      bowler: { bg: 'bg-neon/15', text: 'text-neon', label: 'Bowler' },
      all_rounder: { bg: 'bg-gold/15', text: 'text-gold', label: 'All-Rounder' },
      wicket_keeper: { bg: 'bg-neon/15', text: 'text-neon', label: 'WK' },
    }
    const r = roles[playerRole] || { bg: 'bg-secondary', text: 'text-muted-foreground', label: playerRole }
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${r.bg} ${r.text}`}>
        {r.label}
      </span>
    )
  }

  const interestedCount = players.filter(p => p.interest_status === 'interested').length
  const withdrawnCount = players.filter(p => p.interest_status === 'withdrawn').length

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
                Player Pool
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="px-5 py-4" aria-label="Player summary">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Users className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {players.length}
            </span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-neon" />
            <span className="text-lg font-bold text-neon">
              {interestedCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Interested</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Star className="h-4 w-4 text-destructive" />
            <span className="text-lg font-bold text-destructive">
              {withdrawnCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Withdrawn</span>
          </div>
        </div>
      </section>

      {/* Section Heading */}
      <div className="px-5 mb-3">
        <h2 className="text-lg font-bold text-foreground">
          Players ({players.length})
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Players who have shown interest in this tournament
        </p>
      </div>

      {/* Players List */}
      <section className="px-5 flex flex-col gap-3" aria-label="Players">
        {players.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              No Players Yet
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Players will appear here once they show interest in this tournament
            </p>
          </div>
        ) : (
          players.map((player) => (
            <div
              key={player.id}
              className={cn(
                "glass rounded-xl p-4 flex items-start gap-3",
                player.interest_status === 'withdrawn' && "opacity-60"
              )}
            >
              {/* Avatar */}
              {player.profile_image_url ? (
                <img
                  src={player.profile_image_url}
                  alt={player.name}
                  className="h-11 w-11 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-gold" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Name + Role */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {player.name}
                  </h3>
                  {getRoleBadge(player.role)}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Base</p>
                    <p className="text-xs font-bold text-gold">{player.base_points}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Matches</p>
                    <p className="text-xs font-bold text-foreground">{player.matches_played}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Runs</p>
                    <p className="text-xs font-bold text-foreground">{player.runs_scored}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-md px-2 py-1.5 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase">Wickets</p>
                    <p className="text-xs font-bold text-foreground">{player.wickets_taken}</p>
                  </div>
                </div>

                {/* Hand Info */}
                <div className="flex gap-2 mt-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/50 text-muted-foreground">
                    Bat: {player.batting_hand}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary/50 text-muted-foreground">
                    Bowl: {player.bowling_hand}
                  </span>
                </div>
              </div>

              {/* Interest Status */}
              <div className="shrink-0">
                {player.interest_status === 'withdrawn' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive">
                    Withdrawn
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neon/15 text-neon">
                    Interested
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
