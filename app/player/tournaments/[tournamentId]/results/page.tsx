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
  Check,
  XCircle,
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

interface TeamResult {
  id: string
  rank: number
  name: string
  short_name: string
  color: string
  spent: number
  budget: number
  playersCount: number
  roster: { name: string; role: string; cost: number; imageUrl?: string; isMe: boolean }[]
  logo_url?: string | null
}

export default function PlayerResultsPage({
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
  const [myStatus, setMyStatus] = useState<'sold' | 'unsold' | null>(null)
  const [myTeam, setMyTeam] = useState<{ name: string; short_name: string; color: string; logo_url?: string | null } | null>(null)
  const [mySoldPrice, setMySoldPrice] = useState<number | null>(null)
  const [myBasePrice, setMyBasePrice] = useState<number>(0)
  const [allTeams, setAllTeams] = useState<TeamResult[]>([])
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [totalSold, setTotalSold] = useState(0)
  const [totalUnsold, setTotalUnsold] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [playerId, setPlayerId] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || role !== 'player')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  const fetchResults = useCallback(async () => {
    try {
      // Fetch player profile
      const profileRes = await fetch('/api/players/register')
      const profileData = await profileRes.json()
      const pId = profileData.player?.id || ''
      setPlayerId(pId)
      setPlayerName(profileData.player?.name || '')

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
      const teams = stateData.teams || []

      const sold = sales.filter((s) => s.status === 'sold')
      const unsold = sales.filter((s) => s.status === 'unsold')
      setTotalSold(sold.length)
      setTotalUnsold(unsold.length)

      // Find this player's sale record
      const mySale = sales.find((s) => s.tournament_players?.players?.id === pId)
      if (mySale) {
        setMyStatus(mySale.status as 'sold' | 'unsold')
        if (mySale.status === 'sold' && mySale.teams) {
          setMyTeam(mySale.teams)
          setMySoldPrice(mySale.final_price)
          setExpandedTeam(mySale.teams.id)
        }
        setMyBasePrice(mySale.tournament_players?.base_price || 0)
      }

      // Build team results
      const teamMap = new Map<string, TeamResult>()

      teams.forEach((t: any) => {
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
          logo_url: t.logo_url || null,
        })
      })

      sold.forEach((sale) => {
        if (sale.teams) {
          const team = teamMap.get(sale.teams.id)
          if (team) {
            const pName = sale.tournament_players?.players?.name || 'Unknown'
            const pRole = sale.tournament_players?.players?.role?.replace('_', ' ') || 'Player'
            const imageUrl = sale.tournament_players?.players?.profile_image_url
            const cost = sale.final_price || 0
            const isMe = sale.tournament_players?.players?.id === pId

            team.roster.push({ name: pName, role: pRole, cost, imageUrl, isMe })
            team.playersCount++
          }
        }
      })

      const sorted = Array.from(teamMap.values())
        .sort((a, b) => b.spent - a.spent)
        .map((t, i) => ({ ...t, rank: i + 1 }))

      setAllTeams(sorted)
      setLoading(false)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    if (user && role === 'player') {
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
          <Button onClick={() => router.push('/player/dashboard')}>Back to Dashboard</Button>
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
              onClick={() => router.push('/player/dashboard')}
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

      {/* Your Status Card */}
      <section className="px-5 mb-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Your Auction Result</h2>
        <div className={cn(
          "glass rounded-xl p-4 border",
          myStatus === 'sold' ? "border-neon/30" : "border-destructive/20"
        )}>
          {myStatus === 'sold' && myTeam ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <TeamLogo
                  logoUrl={myTeam?.logo_url}
                  shortName={myTeam?.short_name || ''}
                  color={myTeam?.color || '#F4A261'}
                  size="lg"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Check className="h-4 w-4 text-neon" />
                    <span className="text-sm font-bold text-neon">SOLD!</span>
                  </div>
                  <p className="text-base font-bold text-foreground">
                    {playerName} → {myTeam.name}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-neon/10 rounded-lg p-3 text-center">
                  <Wallet className="h-4 w-4 text-neon mx-auto mb-1" />
                  <span className="text-xl font-bold text-neon">{mySoldPrice}</span>
                  <span className="text-[10px] text-muted-foreground block">Sold Price</span>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <Trophy className="h-4 w-4 text-gold mx-auto mb-1" />
                  <span className="text-xl font-bold text-foreground">{myBasePrice}</span>
                  <span className="text-[10px] text-muted-foreground block">Base Price</span>
                </div>
              </div>
            </>
          ) : myStatus === 'unsold' ? (
            <div className="flex items-center gap-3 py-2">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-bold text-destructive">Unsold</p>
                <p className="text-xs text-muted-foreground">
                  {playerName} was not picked up in this auction (Base: {myBasePrice} pts)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                <User className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground">No Data</p>
                <p className="text-xs text-muted-foreground">
                  Your auction record was not found for this tournament
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* All Teams Leaderboard */}
      <section className="px-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">All Teams</h2>
        <div className="flex flex-col gap-2">
          {allTeams.map((team) => {
            const isMyTeam = myTeam?.name === team.name
            const isExpanded = expandedTeam === team.id

            return (
              <div
                key={team.id}
                className={cn(
                  'glass rounded-xl overflow-hidden',
                  isMyTeam && 'border border-neon/20'
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
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-neon/15 text-neon shrink-0">
                          MY TEAM
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
                    {team.roster.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {team.roster.map((player, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center gap-2 rounded-lg p-2',
                              player.isMe ? 'bg-neon/10 border border-neon/20' : 'bg-secondary/30'
                            )}
                          >
                            <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-foreground truncate">
                                  {player.name}
                                </p>
                                {player.isMe && (
                                  <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-neon/15 text-neon">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{player.role}</p>
                            </div>
                            <span className="text-xs font-bold text-gold font-mono">
                              {player.cost}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
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
