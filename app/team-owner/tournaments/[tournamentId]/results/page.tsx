'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { TeamLogo } from '@/components/team-logo'
import { cn } from '@/lib/utils'
import {
  Loader2,
  ArrowLeft,
  Trophy,
  Wallet,
  Users,
  User,
  Crown,
  Medal,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface SaleData {
  id: string
  final_price: number | null
  status: string
  tournament_players: {
    id: string
    base_price: number
    players: {
      id: string
      name: string
      profile_image_url?: string
      role: string
    }
  }
  teams: {
    id: string
    name: string
    short_name: string
    color: string
    logo_url?: string | null
  } | null
}

interface TeamData {
  id: string
  name: string
  short_name: string
  color: string
  budget: number
  spent: number
  logo_url?: string | null
}

interface TeamResult {
  id: string
  rank: number
  name: string
  short_name: string
  color: string
  spent: number
  budget: number
  playersCount: number
  roster: { name: string; role: string; cost: number; imageUrl?: string }[]
  mvpName: string
  mvpCost: number
  logo_url?: string | null
}

export default function TeamOwnerResultsPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tournamentTitle, setTournamentTitle] = useState('')
  const [myTeam, setMyTeam] = useState<TeamResult | null>(null)
  const [allTeams, setAllTeams] = useState<TeamResult[]>([])
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [totalSold, setTotalSold] = useState(0)
  const [totalUnsold, setTotalUnsold] = useState(0)

  useEffect(() => {
    if (!authLoading && (!user || role !== 'team_owner')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  const fetchResults = useCallback(async () => {
    try {
      // Fetch auction state
      const stateRes = await fetch(`/api/auction/${tournamentId}/state`)
      const stateData = await stateRes.json()

      if (!stateRes.ok) {
        setError(stateData.error || 'Failed to load results')
        setLoading(false)
        return
      }

      setTournamentTitle(stateData.tournament?.title || 'Tournament')

      const sales: SaleData[] = stateData.results || []
      const teams: TeamData[] = stateData.teams || []

      const sold = sales.filter((s) => s.status === 'sold')
      const unsold = sales.filter((s) => s.status === 'unsold')
      setTotalSold(sold.length)
      setTotalUnsold(unsold.length)

      // Build team results
      const teamMap = new Map<string, TeamResult>()

      teams.forEach((t) => {
        teamMap.set(t.id, {
          id: t.id,
          rank: 0,
          name: t.name,
          short_name: t.short_name || t.name.charAt(0),
          color: t.color || '#F4A261',
          spent: t.spent ?? 0,
          budget: t.budget ?? 0,
          playersCount: 0,
          roster: [],
          mvpName: '—',
          mvpCost: 0,
          logo_url: (t as any).logo_url || null,
        })
      })

      sold.forEach((sale) => {
        if (sale.teams) {
          const team = teamMap.get(sale.teams.id)
          if (team) {
            const playerName = sale.tournament_players?.players?.name || 'Unknown'
            const playerRole = sale.tournament_players?.players?.role?.replace('_', ' ') || 'Player'
            const imageUrl = sale.tournament_players?.players?.profile_image_url
            const cost = sale.final_price || 0

            team.roster.push({ name: playerName, role: playerRole, cost, imageUrl })
            team.playersCount++

            if (cost > team.mvpCost) {
              team.mvpName = playerName
              team.mvpCost = cost
            }
          }
        }
      })

      const sorted = Array.from(teamMap.values())
        .sort((a, b) => b.spent - a.spent)
        .map((t, i) => ({ ...t, rank: i + 1 }))

      setAllTeams(sorted)

      // Get the user's team
      const teamsRes = await fetch('/api/teams/register')
      const teamsData = await teamsRes.json()
      const myTeams = teamsData.teams || []
      const myTeamReg = myTeams.find((t: any) => t.tournament_id === tournamentId)

      if (myTeamReg) {
        const found = sorted.find((t) => t.id === myTeamReg.id)
        if (found) {
          setMyTeam(found)
          setExpandedTeam(found.id)
        }
      }

      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    if (user && role === 'team_owner') {
      fetchResults()
    }
  }, [user, role, fetchResults])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="glass rounded-xl p-6 text-center max-w-sm">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push('/team-owner/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-gold" />
    if (rank === 2) return <Medal className="h-5 w-5 text-[#C0C0C0]" />
    if (rank === 3) return <Medal className="h-5 w-5 text-[#CD7F32]" />
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
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
              onClick={() => router.push('/team-owner/dashboard')}
              className="h-10 w-10 rounded-lg glass flex items-center justify-center shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Auction Results
              </h1>
              <p className="text-xs text-muted-foreground">
                {tournamentTitle} · {totalSold} sold, {totalUnsold} unsold
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* My Team Highlight */}
      {myTeam && (
        <section className="px-5 mb-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Your Team</h2>
          <div className="glass rounded-xl p-4 border border-gold/30">
            <div className="flex items-center gap-3 mb-3">
              <TeamLogo
                logoUrl={myTeam.logo_url}
                shortName={myTeam.short_name}
                color={myTeam.color}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground truncate">{myTeam.name}</h3>
                  {getRankIcon(myTeam.rank)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Rank #{myTeam.rank} · {myTeam.playersCount} players
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <Wallet className="h-4 w-4 text-gold mx-auto mb-1" />
                <span className="text-lg font-bold text-foreground">{myTeam.spent}</span>
                <span className="text-[10px] text-muted-foreground block">Spent</span>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <Trophy className="h-4 w-4 text-neon mx-auto mb-1" />
                <span className="text-lg font-bold text-neon">{myTeam.budget - myTeam.spent}</span>
                <span className="text-[10px] text-muted-foreground block">Remaining</span>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-center">
                <Users className="h-4 w-4 text-gold mx-auto mb-1" />
                <span className="text-lg font-bold text-foreground">{myTeam.playersCount}</span>
                <span className="text-[10px] text-muted-foreground block">Players</span>
              </div>
            </div>

            {/* Your Roster */}
            {myTeam.roster.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Your Roster
                </h4>
                <div className="flex flex-col gap-1.5">
                  {myTeam.roster.map((player, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2.5"
                    >
                      {player.imageUrl ? (
                        <img
                          src={player.imageUrl}
                          alt={player.name}
                          className="h-8 w-8 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {player.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {player.role}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-gold font-mono">
                        {player.cost} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {myTeam.roster.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                No players were bought for your team
              </p>
            )}
          </div>
        </section>
      )}

      {/* All Teams Leaderboard */}
      <section className="px-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">All Teams</h2>
        <div className="flex flex-col gap-2">
          {allTeams.map((team) => {
            const isMyTeam = myTeam?.id === team.id
            const isExpanded = expandedTeam === team.id

            return (
              <div
                key={team.id}
                className={cn(
                  'glass rounded-xl overflow-hidden',
                  isMyTeam && 'border border-gold/20'
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                  className="w-full p-3.5 flex items-center gap-3 text-left"
                >
                  <div className="w-6 text-center">{getRankIcon(team.rank)}</div>
                  <TeamLogo
                    logoUrl={team.logo_url}
                    shortName={team.short_name}
                    color={team.color}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {team.name}
                      </h4>
                      {isMyTeam && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gold/15 text-gold shrink-0">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {team.playersCount} players &middot; {team.spent} pts spent
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3.5 pb-3.5 border-t border-border/30 pt-3">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">Budget Left</span>
                        <p className="text-sm font-bold text-foreground">{team.budget - team.spent}</p>
                      </div>
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">MVP</span>
                        <p className="text-[11px] font-bold text-gold truncate">{team.mvpName}</p>
                      </div>
                      <div className="bg-secondary/60 rounded-lg p-2 text-center">
                        <span className="text-[10px] text-muted-foreground">Top Buy</span>
                        <p className="text-sm font-bold text-foreground">{team.mvpCost}</p>
                      </div>
                    </div>

                    {team.roster.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        {team.roster.map((player, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-secondary/30 rounded-lg p-2"
                          >
                            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {player.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{player.role}</p>
                            </div>
                            <span className="text-xs font-bold text-gold font-mono">
                              {player.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {team.roster.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No players bought
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
