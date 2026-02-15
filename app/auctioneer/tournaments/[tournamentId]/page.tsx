'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import {
  Loader2,
  Users,
  Trophy,
  Clock,
  ArrowLeft,
  Play,
  CalendarDays,
  Edit,
  Eye,
  Wallet,
  UserCheck,
  Zap,
} from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string
  auction_date: string
  auction_time: string
  duration_minutes: number
  num_teams: number
  num_players_per_team: number
  min_players_per_team: number
  budget_per_team: number
  status: string
  created_at: string
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/auctioneers/tournaments/${tournamentId}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to load tournament')
          setLoading(false)
          return
        }

        setTournament(data.tournament)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    fetchTournament()
  }, [tournamentId])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const response = await fetch(`/api/auctioneers/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })

      if (response.ok) {
        const data = await response.json()
        setTournament(data.tournament)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to publish tournament')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setPublishing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gold/15', text: 'text-gold', label: 'DRAFT' },
      published: { bg: 'bg-neon/15', text: 'text-neon', label: 'OPEN' },
      live: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'LIVE' },
      completed: { bg: 'bg-secondary', text: 'text-muted-foreground', label: 'COMPLETED' },
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen p-5">
        <div className="glass rounded-xl p-6 max-w-md mx-auto mt-20">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/auctioneer/tournaments')} className="w-full">
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  if (!tournament) return null

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
              onClick={() => router.push('/auctioneer/tournaments')}
              className="h-10 w-10 rounded-lg glass flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {tournament.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage Tournament
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tournament Info Card */}
      <div className="px-5 mb-5">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              {tournament.title}
            </h3>
            {getStatusBadge(tournament.status)}
          </div>

          {tournament.description && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {tournament.description}
            </p>
          )}

          {/* 2x2 Details Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gold shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(tournament.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                <p className="text-sm font-bold text-foreground">{tournament.auction_time}</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-gold shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Teams</p>
                <p className="text-sm font-bold text-foreground">{tournament.num_teams}</p>
              </div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-gold shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                <p className="text-sm font-bold text-foreground">{tournament.budget_per_team} pts</p>
              </div>
            </div>
          </div>

          {/* Status-Based Action Buttons */}
          <div className="flex flex-col gap-2">
            {/* Draft → Publish + Edit */}
            {tournament.status === 'draft' && (
              <>
                <Button
                  size="lg"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full bg-neon text-background hover:bg-neon/90 font-semibold"
                >
                  {publishing ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1.5" />
                  )}
                  {publishing ? 'Publishing...' : 'Publish Tournament'}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/edit`)}
                  className="w-full border-gold/30 text-gold hover:bg-gold/10 bg-transparent font-semibold"
                >
                  <Edit className="h-4 w-4 mr-1.5" />
                  Edit Tournament
                </Button>
              </>
            )}

            {/* Published → View Teams, View Players, Start Auction */}
            {tournament.status === 'published' && (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/auction`)}
                  className="w-full bg-neon text-background hover:bg-neon/90 font-semibold"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Start Auction
                </Button>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/teams`)}
                  className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Registered Teams
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/players`)}
                  className="w-full border-gold/30 text-gold hover:bg-gold/10 bg-transparent font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Player Pool
                </Button>
              </>
            )}

            {/* Live → Go to Auction Control + View Teams/Players */}
            {tournament.status === 'live' && (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/auction`)}
                  className="w-full bg-neon text-background hover:bg-neon/90 font-semibold"
                >
                  <Play className="h-4 w-4 mr-1.5" />
                  Go to Auction Control
                </Button>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/teams`)}
                  className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Registered Teams
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/players`)}
                  className="w-full border-gold/30 text-gold hover:bg-gold/10 bg-transparent font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Player Pool
                </Button>
              </>
            )}

            {/* Completed → View Results, View Teams, View Players */}
            {tournament.status === 'completed' && (
              <>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/auction`)}
                  className="w-full bg-gold text-background hover:bg-gold/90 font-semibold"
                >
                  <Trophy className="h-4 w-4 mr-1.5" />
                  View Auction Results
                </Button>
                <Button
                  size="lg"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/teams`)}
                  className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Registered Teams
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/players`)}
                  className="w-full border-gold/30 text-gold hover:bg-gold/10 bg-transparent font-semibold"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  View Player Pool
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Details Section */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Tournament Information</h2>

        <div className="glass rounded-xl p-4 space-y-3">
          {/* Budget */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gold/15 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Budget Per Team</p>
                <p className="text-sm font-semibold text-foreground">{tournament.budget_per_team} pts</p>
              </div>
            </div>
          </div>

          {/* Players */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-neon/15 flex items-center justify-center">
                <Users className="h-4 w-4 text-neon" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Players Per Team</p>
                <p className="text-sm font-semibold text-foreground">
                  {tournament.num_players_per_team} (min: {tournament.min_players_per_team})
                </p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gold/15 flex items-center justify-center">
                <Clock className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold text-foreground">{tournament.duration_minutes} minutes</p>
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gold/15 flex items-center justify-center">
                <UserCheck className="h-4 w-4 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-semibold text-foreground">
                  {new Date(tournament.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 mt-4">
          <div className="glass rounded-xl p-4 border border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
