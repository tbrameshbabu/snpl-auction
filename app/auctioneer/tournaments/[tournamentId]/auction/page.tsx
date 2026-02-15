'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import { BiddingScreen } from '@/components/screens/bidding-screen'
import { ResultsScreen } from '@/components/screens/results-screen'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Calendar,
  Clock,
  Users,
  Play,
  ChevronRight,
  User,
  ArrowLeft,
  Shield,
  Wallet,
  Trophy,
  Zap,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
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

interface Team {
  id: string
  name: string
  short_name: string
  color: string
  owner_name: string
  budget: number
  created_at: string
  users?: { email: string }
}

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
  order_index?: number
}

type ScreenView = 'overview' | 'bidding' | 'results'

export default function AuctionControlPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'teams' | 'players'>('teams')
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [screen, setScreen] = useState<ScreenView>('overview')
  const [startingAuction, setStartingAuction] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderDirty, setOrderDirty] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

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

        // If tournament is already live, go straight to bidding
        if (tournamentData.tournament?.status === 'live') {
          setScreen('bidding')
        }
        // If tournament is completed, go straight to results
        if (tournamentData.tournament?.status === 'completed') {
          setScreen('results')
        }

        const teamsRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}/teams`)
        const teamsData = await teamsRes.json()
        if (teamsRes.ok) {
          setTeams(teamsData.teams || [])
        }

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

    if (user && role === 'auctioneer') {
      fetchData()
    }
  }, [tournamentId, user, role])

  /* ── Start Auction ── */
  const handleStartAuction = useCallback(async () => {
    if (startingAuction || !tournament) return
    setStartingAuction(true)

    try {
      const res = await fetch(`/api/auction/${tournamentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to start auction')
        setStartingAuction(false)
        return
      }

      setTournament((prev) => prev ? { ...prev, status: 'live' } : prev)
      setScreen('bidding')
    } catch (err: any) {
      setError(err.message || 'Failed to start auction')
    } finally {
      setStartingAuction(false)
    }
  }, [tournament, tournamentId, startingAuction])

  /* ── Move player in list ── */
  const movePlayer = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= players.length) return
    setPlayers(prev => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
    setOrderDirty(true)
    setOrderSaved(false)
  }, [players.length])

  /* ── Save player order ── */
  const saveOrder = useCallback(async () => {
    if (savingOrder) return
    setSavingOrder(true)
    try {
      const playerOrder = players.map((p, i) => ({
        player_id: p.id,
        order_index: i + 1,
      }))

      const res = await fetch(`/api/auctioneers/tournaments/${tournamentId}/players`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerOrder }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save order')
        return
      }

      setOrderDirty(false)
      setOrderSaved(true)
      setTimeout(() => setOrderSaved(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingOrder(false)
    }
  }, [players, tournamentId, savingOrder])

  /* ── Drag handlers ── */
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    movePlayer(dragIndex, index)
    setDragIndex(index)
  }, [dragIndex, movePlayer])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
  }, [])

  /* ── Screen navigation ── */
  const handleNavigate = useCallback((target: string) => {
    if (target === 'results') {
      setScreen('results')
    } else if (target === 'bidding') {
      setScreen('bidding')
    } else {
      setScreen('overview')
    }
  }, [])

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gold/15', text: 'text-gold', label: 'DRAFT' },
      published: { bg: 'bg-neon/15', text: 'text-neon', label: 'OPEN' },
      live: { bg: 'bg-destructive/15', text: 'text-destructive', label: 'LIVE' },
      completed: { bg: 'bg-secondary', text: 'text-muted-foreground', label: 'DONE' },
    }
    const badge = badges[status] || badges.draft
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getRoleBadge = (playerRole: string) => {
    const roles: Record<string, { bg: string; text: string; label: string }> = {
      batsman: { bg: 'bg-gold/15', text: 'text-gold', label: 'BAT' },
      bowler: { bg: 'bg-neon/15', text: 'text-neon', label: 'BOWL' },
      all_rounder: { bg: 'bg-gold/15', text: 'text-gold', label: 'AR' },
      wicket_keeper: { bg: 'bg-neon/15', text: 'text-neon', label: 'WK' },
    }
    const r = roles[playerRole] || { bg: 'bg-secondary', text: 'text-muted-foreground', label: playerRole }
    return (
      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${r.bg} ${r.text}`}>
        {r.label}
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

  /* ── Render content based on screen ── */
  const renderContent = () => {
    if (screen === 'bidding') {
      return (
        <BiddingScreen
          tournamentId={tournamentId}
          onNavigate={handleNavigate}
        />
      )
    }

    if (screen === 'results') {
      return (
        <ResultsScreen
          tournamentId={tournamentId}
          onNavigate={handleNavigate}
        />
      )
    }

    /* ── Overview (default) ── */
    return (
      <div className="pb-24">
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
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">
                  Auction Control
                </h1>
                <p className="text-xs text-muted-foreground">
                  {tournament.title}
                </p>
              </div>
              {getStatusBadge(tournament.status)}
            </div>
          </div>
        </header>

        {/* Tournament Info */}
        <section className="px-5 mb-4">
          <div className="glass rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gold shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {new Date(tournament.auction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gold shrink-0" />
                <span className="text-xs text-muted-foreground">{tournament.auction_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gold shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {teams.length}/{tournament.num_teams}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {tournament.status === 'published' && (
              <>
                {(teams.length === 0 || players.length === 0) && (
                  <p className="text-xs text-destructive mb-2 text-center">
                    {teams.length === 0 && players.length === 0
                      ? 'Register teams and players before starting the auction'
                      : teams.length === 0
                        ? 'Register at least one team before starting'
                        : 'At least one player must show interest before starting'}
                  </p>
                )}
                <Button
                  size="lg"
                  onClick={handleStartAuction}
                  disabled={startingAuction || teams.length === 0 || players.length === 0}
                  className="w-full bg-neon text-background hover:bg-neon/90 font-semibold disabled:opacity-50"
                >
                  {startingAuction ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1.5" />
                  )}
                  {startingAuction ? 'Starting...' : 'Start Auction'}
                </Button>
              </>
            )}
            {tournament.status === 'live' && (
              <Button
                size="lg"
                onClick={() => setScreen('bidding')}
                className="w-full bg-neon text-background hover:bg-neon/90 font-semibold"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                Go to Live Auction
              </Button>
            )}
            {tournament.status === 'completed' && (
              <Button
                size="lg"
                onClick={() => setScreen('results')}
                className="w-full bg-gold text-background hover:bg-gold/90 font-semibold"
              >
                <Trophy className="h-4 w-4 mr-1.5" />
                View Results
              </Button>
            )}
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="px-5 mb-4">
          <div className="glass rounded-xl p-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('teams')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === 'teams'
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Shield className="h-3.5 w-3.5 inline mr-1.5" />
              Teams ({teams.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200",
                activeTab === 'players'
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="h-3.5 w-3.5 inline mr-1.5" />
              Players ({players.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <section className="px-5 flex flex-col gap-3" aria-label={activeTab === 'teams' ? 'Teams' : 'Players'}>
          {activeTab === 'teams' ? (
            teams.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-muted-foreground">No Teams Registered</h3>
                <p className="text-xs text-muted-foreground/70 mt-1">Teams will appear here once they register</p>
              </div>
            ) : (
              teams.map((team) => {
                const isExpanded = expandedTeam === team.id
                return (
                  <div key={team.id} className="glass rounded-xl overflow-hidden transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div
                        className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ backgroundColor: `${team.color || '#F4A261'}20`, color: team.color || '#F4A261' }}
                      >
                        {team.short_name || team.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{team.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {team.users?.email || team.owner_name} · {team.budget} pts
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                        isExpanded && "rotate-90"
                      )} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 animate-slide-in-right">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-gold shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                              <p className="text-sm font-bold text-foreground">{team.budget} pts</p>
                            </div>
                          </div>
                          <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gold shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Registered</p>
                              <p className="text-sm font-bold text-foreground">
                                {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )
          ) : (
            players.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-muted-foreground">No Players Yet</h3>
                <p className="text-xs text-muted-foreground/70 mt-1">Players will appear once they show interest</p>
              </div>
            ) : (
              <>
                {/* Reorder controls */}
                {tournament.status !== 'live' && tournament.status !== 'completed' && (
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-muted-foreground">
                      <GripVertical className="h-3 w-3 inline mr-1" />
                      Drag or use arrows to set auction order
                    </p>
                    <Button
                      size="sm"
                      onClick={saveOrder}
                      disabled={!orderDirty || savingOrder}
                      className={cn(
                        'h-8 px-3 text-xs font-semibold transition-all',
                        orderSaved
                          ? 'bg-neon/15 text-neon hover:bg-neon/25'
                          : orderDirty
                            ? 'bg-gold text-background hover:bg-gold/90'
                            : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {savingOrder ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : orderSaved ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : (
                        <Save className="h-3 w-3 mr-1" />
                      )}
                      {savingOrder ? 'Saving...' : orderSaved ? 'Saved!' : 'Save Order'}
                    </Button>
                  </div>
                )}

                {players.map((player, i) => (
                  <div
                    key={player.id}
                    draggable={tournament.status !== 'live' && tournament.status !== 'completed'}
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'glass rounded-xl p-3 flex items-center gap-2 transition-all cursor-grab active:cursor-grabbing',
                      dragIndex === i && 'opacity-50 scale-[0.98] border border-gold/30'
                    )}
                  >
                    {/* Drag handle + order number */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0 w-7">
                      {tournament.status !== 'live' && tournament.status !== 'completed' && (
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">
                        #{i + 1}
                      </span>
                    </div>

                    {/* Player avatar */}
                    {player.profile_image_url ? (
                      <img src={player.profile_image_url} alt={player.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-gold" />
                      </div>
                    )}

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{player.name}</h4>
                        {getRoleBadge(player.role)}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground">
                          Base: <span className="font-bold text-gold">{player.base_points}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">M: {player.matches_played}</span>
                        <span className="text-[10px] text-muted-foreground">R: {player.runs_scored}</span>
                        <span className="text-[10px] text-muted-foreground">W: {player.wickets_taken}</span>
                      </div>
                    </div>

                    {/* Up/Down arrows */}
                    {tournament.status !== 'live' && tournament.status !== 'completed' && (
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); movePlayer(i, i - 1) }}
                          disabled={i === 0}
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-secondary/80 disabled:opacity-20 transition-colors"
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); movePlayer(i, i + 1) }}
                          disabled={i === players.length - 1}
                          className="h-6 w-6 rounded flex items-center justify-center hover:bg-secondary/80 disabled:opacity-20 transition-colors"
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      {renderContent()}
    </div>
  )
}
