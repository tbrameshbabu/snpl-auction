'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Check,
  XCircle,
  Clock,
  Users,
  Trophy,
  Zap,
  Star,
  Shield,
  ChevronRight,
  AlertTriangle,
  Calendar,
  User,
} from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string
  auction_date: string
  auction_time: string
  status: string
  num_teams: number
  budget_per_team: number
}

interface PlayerInterest {
  id: string
  status: string
  tournament_id: string
}

export default function PlayerDashboardPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [interests, setInterests] = useState<PlayerInterest[]>([])
  const [player, setPlayer] = useState<any>(null)
  const [showingInterest, setShowingInterest] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || role !== 'player')) {
      router.push('/auth/login')
      return
    }

    if (user && role === 'player') {
      fetchPlayerData()
    }
  }, [user, role, authLoading, router])

  const fetchPlayerData = async () => {
    try {
      // Fetch player profile
      const profileRes = await fetch('/api/players/register')
      if (profileRes.status === 404) {
        router.push('/player/register')
        return
      }
      const profileData = await profileRes.json()
      setPlayer(profileData.player)

      // Fetch published tournaments
      const tournamentsRes = await fetch('/api/auctioneers/tournaments?status=published')
      const tournamentsData = await tournamentsRes.json()
      const fetchedTournaments = tournamentsData.tournaments || []
      setTournaments(fetchedTournaments)

      // Auto-expand the first tournament
      if (fetchedTournaments.length > 0) {
        setExpandedId(fetchedTournaments[0].id)
      }

      // Fetch player interests
      const interestsRes = await fetch('/api/players/interests')
      const interestsData = await interestsRes.json()
      setInterests(interestsData.interests || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShowInterest = async (tournamentId: string) => {
    setShowingInterest(tournamentId)
    try {
      const response = await fetch('/api/players/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tournament_id: tournamentId,
          status: 'interested'
        }),
      })

      if (response.ok) {
        const interestsRes = await fetch('/api/players/interests')
        const interestsData = await interestsRes.json()
        setInterests(interestsData.interests || [])
      } else {
        const errorData = await response.json()
        console.error('Failed to show interest:', errorData)
      }
    } catch (error) {
      console.error('Error showing interest:', error)
    } finally {
      setShowingInterest(null)
    }
  }

  const hasInterest = (tournamentId: string) => {
    return interests.some(i => i.tournament_id === tournamentId && i.status === 'interested')
  }

  const isWithdrawn = (tournamentId: string) => {
    return interests.some(i => i.tournament_id === tournamentId && i.status === 'withdrawn')
  }

  const handleWithdraw = async (tournamentId: string) => {
    setWithdrawing(tournamentId)
    setShowWithdrawConfirm(null)
    try {
      const response = await fetch('/api/players/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tournament_id: tournamentId,
          status: 'withdrawn'
        }),
      })

      if (response.ok) {
        const interestsRes = await fetch('/api/players/interests')
        const interestsData = await interestsRes.json()
        setInterests(interestsData.interests || [])
      }
    } catch (error) {
      console.error('Error withdrawing:', error)
    } finally {
      setWithdrawing(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-neon'
      case 'live': return 'text-gold'
      case 'draft': return 'text-muted-foreground'
      case 'completed': return 'text-destructive'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'published': return 'bg-neon/15'
      case 'live': return 'bg-gold/15'
      case 'draft': return 'bg-secondary'
      case 'completed': return 'bg-destructive/15'
      default: return 'bg-secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Open'
      case 'live': return 'Live'
      case 'draft': return 'Draft'
      case 'completed': return 'Completed'
      default: return status
    }
  }

  const interestedCount = interests.filter(i => i.status === 'interested').length
  const withdrawnCount = interests.filter(i => i.status === 'withdrawn').length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Unified App Header */}
      <AppHeader />

      {/* Player Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.08),transparent_60%)]" />
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            {player?.profile_image_url ? (
              <img
                src={player.profile_image_url}
                alt={player.name}
                className="h-12 w-12 rounded-full object-cover border-2 border-yellow-400"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Welcome back, {player?.name || 'Player'}
              </h1>
              <p className="text-xs text-muted-foreground capitalize">
                {player?.role?.replace('_', ' ') || 'Player'} · Manage your tournament preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="px-5 py-4" aria-label="Your status summary">
        <div className="grid grid-cols-4 gap-2">
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {player?.base_points || 0}
            </span>
            <span className="text-[10px] text-muted-foreground">Points</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {tournaments.length}
            </span>
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Check className="h-4 w-4 text-neon" />
            <span className="text-lg font-bold text-neon">
              {interestedCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Interested</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <XCircle className="h-4 w-4 text-destructive" />
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
          Available Tournaments
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Show interest to participate in upcoming auctions
        </p>
      </div>

      {/* Tournament List */}
      <section className="px-5 flex flex-col gap-3" aria-label="Tournaments">
        {tournaments.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">No tournaments available</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for upcoming tournaments</p>
          </div>
        ) : (
          tournaments.map((tournament) => {
            const interested = hasInterest(tournament.id)
            const withdrawn = isWithdrawn(tournament.id)
            const isPending = !interested && !withdrawn
            const isExpanded = expandedId === tournament.id
            const auctionDate = new Date(tournament.auction_date)

            return (
              <div
                key={tournament.id}
                className={cn(
                  "glass rounded-xl overflow-hidden transition-all duration-300",
                  interested && "border-neon/40",
                  withdrawn && "border-destructive/30 opacity-60"
                )}
              >
                {/* Card Header - always visible */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div
                    className={cn(
                      "h-11 w-11 rounded-lg flex items-center justify-center shrink-0",
                      interested
                        ? "bg-neon/15"
                        : withdrawn
                          ? "bg-destructive/15"
                          : "bg-gold/10"
                    )}
                  >
                    {interested ? (
                      <Check className="h-5 w-5 text-neon" />
                    ) : withdrawn ? (
                      <XCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Trophy className="h-5 w-5 text-gold" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {tournament.title}
                      </h3>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                          getStatusBg(tournament.status),
                          getStatusColor(tournament.status)
                        )}
                      >
                        {getStatusLabel(tournament.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {auctionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {tournament.auction_time}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-slide-in-right">
                    {/* Tournament description */}
                    {tournament.description && (
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        {tournament.description}
                      </p>
                    )}

                    {/* Tournament Details Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Date
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {auctionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Time
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.auction_time}
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Teams
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.num_teams}
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Budget/Team
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.budget_per_team} pts
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interest Actions — matches player-interest-screen pattern */}
                    {isPending && (
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          onClick={() => handleShowInterest(tournament.id)}
                          disabled={showingInterest === tournament.id}
                          className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold"
                        >
                          {showingInterest === tournament.id ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1.5" />
                          )}
                          {showingInterest === tournament.id ? 'Processing...' : 'Show Interest'}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setShowWithdrawConfirm(tournament.id)}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Withdraw
                        </Button>
                      </div>
                    )}

                    {interested && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon/10 border border-neon/20">
                          <Check className="h-4 w-4 text-neon shrink-0" />
                          <span className="text-sm font-medium text-neon">
                            You have shown interest in this tournament
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowWithdrawConfirm(tournament.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs self-start"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Withdraw instead
                        </Button>
                      </div>
                    )}

                    {withdrawn && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="text-sm font-medium text-destructive">
                            You have withdrawn from this tournament
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleShowInterest(tournament.id)}
                          className="text-neon hover:text-neon hover:bg-neon/10 text-xs self-start"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Re-confirm interest
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Withdraw Confirmation Modal (inline) */}
                {showWithdrawConfirm === tournament.id && (
                  <div className="px-4 pb-4">
                    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Confirm Withdrawal
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Are you sure you want to withdraw from{' '}
                            <span className="text-foreground font-medium">
                              {tournament.title}
                            </span>
                            ? You can re-confirm interest later if the auction hasn't started.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleWithdraw(tournament.id)}
                          disabled={withdrawing === tournament.id}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                        >
                          {withdrawing === tournament.id ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : null}
                          Yes, Withdraw
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowWithdrawConfirm(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* Info Banner */}
      <section className="px-5 py-6">
        <div className="glass rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              Before the Auction Begins
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Show interest in tournaments to be included in the auction pool. 
              Once the auction starts, your participation status will be locked.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
