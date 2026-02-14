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
  CalendarDays,
  Wallet,
  UserCheck,
  Check,
  XCircle,
  AlertTriangle,
  Shield,
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
  auctioneers: {
    name: string
    organization: string
  }
}

export default function PublicTournamentDetailPage({ 
  params 
}: { 
  params: Promise<{ tournamentId: string }> 
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [error, setError] = useState('')
  
  // User-specific states
  const [playerInterest, setPlayerInterest] = useState<string | null>(null) // 'interested' | 'withdrawn' | null
  const [teamRegistered, setTeamRegistered] = useState<boolean>(false)
  const [teamName, setTeamName] = useState<string>('')
  const [actionLoading, setActionLoading] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)

  useEffect(() => {
    fetchTournament()
  }, [tournamentId])

  // Fetch user-specific data once auth + tournament are loaded
  useEffect(() => {
    if (!authLoading && user && tournament) {
      if (role === 'player') fetchPlayerInterest()
      if (role === 'team_owner') fetchTeamRegistration()
    }
  }, [authLoading, user, role, tournament])

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`)
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

  const fetchPlayerInterest = async () => {
    try {
      const res = await fetch('/api/players/interests')
      const data = await res.json()
      const interests = data.interests || []
      const match = interests.find((i: any) => i.tournament_id === tournamentId)
      setPlayerInterest(match ? match.status : null)
    } catch (e) {
      console.error('Error fetching player interest:', e)
    }
  }

  const fetchTeamRegistration = async () => {
    try {
      const res = await fetch('/api/teams/register')
      const data = await res.json()
      const teams = data.teams || []
      const match = teams.find((t: any) => t.tournament_id === tournamentId)
      if (match) {
        setTeamRegistered(true)
        setTeamName(match.name)
      }
    } catch (e) {
      console.error('Error fetching team registration:', e)
    }
  }

  const handleShowInterest = async () => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/players/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId, status: 'interested' }),
      })
      if (res.ok) {
        setPlayerInterest('interested')
      }
    } catch (e) {
      console.error('Error showing interest:', e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleWithdrawInterest = async () => {
    setActionLoading(true)
    setShowWithdrawConfirm(false)
    try {
      const res = await fetch('/api/players/interests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournament_id: tournamentId, status: 'withdrawn' }),
      })
      if (res.ok) {
        setPlayerInterest('withdrawn')
      }
    } catch (e) {
      console.error('Error withdrawing:', e)
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gold/15', text: 'text-gold', label: 'DRAFT' },
      published: { bg: 'bg-neon/15', text: 'text-neon', label: 'OPEN' },
      live: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'LIVE' },
      completed: { bg: 'bg-secondary', text: 'text-muted-foreground', label: 'COMPLETED' }
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
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
          <Button onClick={() => router.push('/tournaments')} className="w-full">
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.08),transparent_60%)]" />
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="h-10 w-10 rounded-lg glass flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {tournament.title}
              </h1>
              <p className="text-xs text-muted-foreground">
                Tournament Details
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

          {/* ─── User-Aware Actions ─── */}

          {/* Not logged in → show register/login buttons */}
          {!user && tournament.status === 'published' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push('/auth/signup')}
                className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold"
              >
                Register as Player
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/auth/signup')}
                className="flex-1 border-gold/30 text-gold hover:bg-gold/10 bg-transparent"
              >
                Team Owner
              </Button>
            </div>
          )}

          {/* Player Actions */}
          {user && role === 'player' && tournament.status === 'published' && (
            <div>
              {/* Not yet interested */}
              {playerInterest === null && (
                <div className="flex gap-2">
                  <Button
                    size="lg"
                    onClick={handleShowInterest}
                    disabled={actionLoading}
                    className="flex-1 bg-neon text-background hover:bg-neon/90 font-semibold"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-1.5" />
                    )}
                    Show Interest
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setShowWithdrawConfirm(true)}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold bg-transparent"
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Skip
                  </Button>
                </div>
              )}

              {/* Interested */}
              {playerInterest === 'interested' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon/10 border border-neon/20">
                    <Check className="h-4 w-4 text-neon shrink-0" />
                    <span className="text-sm font-medium text-neon">
                      You&apos;ve shown interest in this tournament
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowWithdrawConfirm(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs self-start"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Withdraw interest
                  </Button>
                </div>
              )}

              {/* Withdrawn */}
              {playerInterest === 'withdrawn' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium text-destructive">
                      You&apos;ve withdrawn from this tournament
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleShowInterest}
                    disabled={actionLoading}
                    className="text-neon hover:text-neon hover:bg-neon/10 text-xs self-start"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Re-confirm interest
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Team Owner Actions */}
          {user && role === 'team_owner' && tournament.status === 'published' && (
            <div>
              {teamRegistered ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-neon/10 border border-neon/20">
                  <Shield className="h-4 w-4 text-neon shrink-0" />
                  <span className="text-sm font-medium text-neon">
                    {teamName} is registered for this tournament
                  </span>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={() => router.push('/team-owner/dashboard')}
                  className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
                >
                  <Shield className="h-4 w-4 mr-1.5" />
                  Register Your Team
                </Button>
              )}
            </div>
          )}

          {/* Auctioneer Actions */}
          {user && role === 'auctioneer' && (
            <Button
              size="lg"
              onClick={() => router.push('/auctioneer/dashboard')}
              className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Go to Auctioneer Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Withdraw Confirmation (inline) */}
      {showWithdrawConfirm && (
        <div className="px-5 mb-5">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Withdraw Interest
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Are you sure you want to withdraw from{' '}
                  <span className="text-foreground font-medium">{tournament.title}</span>?
                  You won&apos;t be included in the auction player pool.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleWithdrawInterest}
                disabled={actionLoading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
              >
                {actionLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Yes, Withdraw
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowWithdrawConfirm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details Section */}
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

          {/* Organizer */}
          {tournament.auctioneers && (
            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gold/15 flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Organized by</p>
                  <p className="text-sm font-semibold text-foreground">{tournament.auctioneers.name}</p>
                  {tournament.auctioneers.organization && (
                    <p className="text-xs text-muted-foreground">{tournament.auctioneers.organization}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
