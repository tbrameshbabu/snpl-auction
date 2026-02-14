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
  AlertTriangle,
  Zap,
  Shield,
  Star,
  ChevronRight,
  Wallet,
  UserCheck,
  UsersRound,
} from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string
  auction_date: string
  auction_time: string
  status: string
  num_teams: number
  num_players_per_team: number
  budget_per_team: number
}

// Track team registration status per tournament
interface TeamRegistration {
  id: string
  tournament_id: string
  name: string
  short_name: string
  color: string
  budget: number
  spent: number
  status: string
}

export default function TeamOwnerDashboardPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [myTeams, setMyTeams] = useState<TeamRegistration[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && (!user || role !== 'team_owner')) {
      router.push('/auth/login')
      return
    }

    if (user && role === 'team_owner') {
      fetchData()
    }
  }, [user, role, authLoading, router])

  const fetchData = async () => {
    try {
      const [tournamentsRes, teamsRes] = await Promise.all([
        fetch('/api/auctioneers/tournaments?status=published'),
        fetch('/api/teams/register'),
      ])
      const tournamentsData = await tournamentsRes.json()
      const teamsData = await teamsRes.json()
      setTournaments(tournamentsData.tournaments || [])
      setMyTeams(teamsData.teams || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get team registration for a tournament
  const getTeamForTournament = (tournamentId: string) => {
    return myTeams.find(t => t.tournament_id === tournamentId)
  }

  const getInterestStatus = (tournamentId: string): 'pending' | 'interested' | 'withdrawn' => {
    const team = getTeamForTournament(tournamentId)
    if (!team) return 'pending'
    if (team.status === 'withdrawn') return 'withdrawn'
    return 'interested' // confirmed or interested both count
  }

  const handleJoinAuction = async (tournamentId: string) => {
    setJoining(tournamentId)
    try {
      const response = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournamentId,
          name: `Team ${user?.email?.split('@')[0] || 'Owner'}`,
          short_name: (user?.email?.slice(0, 3) || 'OWN').toUpperCase(),
          color: '#F4A261',
        }),
      })

      if (response.ok) {
        await fetchData()
      } else {
        const err = await response.json()
        console.error('Failed to join:', err)
      }
    } catch (error) {
      console.error('Error joining auction:', error)
    } finally {
      setJoining(null)
    }
  }

  const handleWithdraw = async (tournamentId: string) => {
    setWithdrawing(tournamentId)
    setShowWithdrawConfirm(null)
    try {
      const team = getTeamForTournament(tournamentId)
      if (!team) return

      // Update team status to withdrawn
      const response = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournament_id: tournamentId,
          name: team.name,
          short_name: team.short_name,
          color: team.color,
          status: 'withdrawn',
        }),
      })

      // Refetch regardless (the team status change is server-side)
      await fetchData()
    } catch (error) {
      console.error('Error withdrawing:', error)
    } finally {
      setWithdrawing(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-neon'
      case 'registering': return 'text-neon'
      case 'live': return 'text-destructive'
      case 'completed': return 'text-muted-foreground'
      case 'draft': return 'text-gold'
      default: return 'text-gold'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'published': return 'bg-neon/15'
      case 'registering': return 'bg-neon/15'
      case 'live': return 'bg-destructive/15'
      case 'completed': return 'bg-secondary'
      case 'draft': return 'bg-gold/15'
      default: return 'bg-gold/15'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Open'
      case 'registering': return 'Open'
      case 'live': return 'Live'
      case 'completed': return 'Done'
      case 'draft': return 'Draft'
      default: return status
    }
  }

  const joinedCount = myTeams.filter(t => t.status !== 'withdrawn').length
  const withdrawnCount = myTeams.filter(t => t.status === 'withdrawn').length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
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
            <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center">
              <Shield className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Welcome back, Manager
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your team auction participation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="px-5 py-4" aria-label="Your status summary">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {tournaments.length}
            </span>
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Check className="h-4 w-4 text-neon" />
            <span className="text-lg font-bold text-neon">
              {joinedCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Joined</span>
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
          Available Auctions
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Join or withdraw your team before the auction fills up
        </p>
      </div>

      {/* Auction List */}
      <section
        className="px-5 flex flex-col gap-3"
        aria-label="Auction events for teams"
      >
        {tournaments.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              No Tournaments Available
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Check back later for upcoming auction events
            </p>
          </div>
        ) : (
          tournaments.map((tournament) => {
            const interest = getInterestStatus(tournament.id)
            const myTeam = getTeamForTournament(tournament.id)
            const isExpanded = expandedId === tournament.id
            const auctionDate = new Date(tournament.auction_date)
            // We don't have real-time registered count from this API,
            // use num_teams as total slots
            const totalSlots = tournament.num_teams
            const slotsPercentage = myTeam ? 80 : 50 // approximate visual
            const isFull = false // We can't determine this from current data

            return (
              <div
                key={tournament.id}
                className={cn(
                  "glass rounded-xl overflow-hidden transition-all duration-300",
                  interest === 'interested' && "border-neon/40",
                  interest === 'withdrawn' && "border-destructive/30 opacity-60",
                )}
              >
                {/* Card Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div
                    className={cn(
                      "h-11 w-11 rounded-lg flex items-center justify-center shrink-0",
                      interest === 'interested'
                        ? "bg-neon/15"
                        : interest === 'withdrawn'
                          ? "bg-destructive/15"
                          : "bg-gold/10"
                    )}
                  >
                    {interest === 'interested' ? (
                      <Check className="h-5 w-5 text-neon" />
                    ) : interest === 'withdrawn' ? (
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
                    {/* Description */}
                    {tournament.description && (
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        {tournament.description}
                      </p>
                    )}

                    {/* Team Slots Indicator */}
                    <div className="mb-4 p-3 rounded-lg bg-secondary/50 flex items-center gap-3">
                      <UsersRound className="h-5 w-5 text-gold shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">
                            Team Slots
                          </span>
                          <span className="text-xs font-bold text-neon">
                            {tournament.num_teams} slots total
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 bg-gold"
                            style={{ width: `${slotsPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Auction Details Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Users className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Players/Team
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.num_players_per_team}
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Budget
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.budget_per_team} pts
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Roster Size
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.num_players_per_team} players
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Star className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Teams
                          </p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.num_teams}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Interest/Withdraw Actions */}
                    {interest === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="lg"
                          onClick={() => handleJoinAuction(tournament.id)}
                          disabled={joining === tournament.id}
                          className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold"
                        >
                          {joining === tournament.id ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1.5" />
                          )}
                          {joining === tournament.id ? 'Joining...' : 'Join Auction'}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setShowWithdrawConfirm(tournament.id)}
                          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold bg-transparent"
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Skip
                        </Button>
                      </div>
                    )}

                    {interest === 'interested' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon/10 border border-neon/20">
                          <Check className="h-4 w-4 text-neon shrink-0" />
                          <span className="text-sm font-medium text-neon">
                            Your team is confirmed for this auction
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowWithdrawConfirm(tournament.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs self-start"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Withdraw team
                        </Button>
                      </div>
                    )}

                    {interest === 'withdrawn' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                          <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          <span className="text-sm font-medium text-destructive">
                            Your team has withdrawn from this auction
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleJoinAuction(tournament.id)}
                          className="text-neon hover:text-neon hover:bg-neon/10 text-xs self-start"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Re-join auction
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
                            Withdraw Team
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Are you sure you want to withdraw your team from{' '}
                            <span className="text-foreground font-medium">
                              {tournament.title}
                            </span>
                            ? Your slot will be released and another team can take it.
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
              You can join or withdraw your team from any auction before it
              locks. Once all team slots are filled or the auction begins,
              changes will no longer be possible. Your budget and roster size are
              set per auction.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
