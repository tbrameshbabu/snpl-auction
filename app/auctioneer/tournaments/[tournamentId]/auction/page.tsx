'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Clock, Users, Play, ChevronDown, ChevronUp, User, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  owner_name: string
  budget: number
  created_at: string
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
}

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

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tournament details
        const tournamentRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}`)
        const tournamentData = await tournamentRes.json()

        if (!tournamentRes.ok) {
          setError(tournamentData.error || 'Failed to load tournament')
          setLoading(false)
          return
        }

        setTournament(tournamentData.tournament)

        // Fetch teams
        const teamsRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}/teams`)
        const teamsData = await teamsRes.json()
        if (teamsRes.ok) {
          setTeams(teamsData.teams || [])
        }

        // Fetch players
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">DRAFT</Badge>
      case 'published':
        return <Badge className="bg-blue-600">PUBLISHED</Badge>
      case 'live':
        return <Badge className="bg-green-600">LIVE</Badge>
      case 'completed':
        return <Badge variant="secondary">COMPLETED</Badge>
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500'
      case 'bowler': return 'bg-green-500'
      case 'all_rounder': return 'bg-purple-500'
      case 'wicket_keeper': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-500">{error || 'Tournament not found'}</p>
              <Button onClick={() => router.push('/auctioneer/tournaments')} className="mt-4">
                Back to Tournaments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Auction Control</h1>
            <p className="text-gray-400 text-sm">Manage your auction event</p>
          </div>
        </div>

        {/* Auction Info Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{tournament.title}</h3>
              {getStatusBadge(tournament.status)}
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(tournament.auction_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{tournament.auction_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {teams.length}/{tournament.num_teams} teams
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {tournament.status === 'published' && (
                <Button className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Auction
                </Button>
              )}
              {tournament.status === 'live' && (
                <Button className="flex-1">
                  Go to Auction Control
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab Switcher */}
        <Card>
          <CardContent className="p-2">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'teams' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('teams')}
                className="flex-1"
              >
                Registered Teams ({teams.length})
              </Button>
              <Button
                variant={activeTab === 'players' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('players')}
                className="flex-1"
              >
                Player Pool ({players.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {activeTab === 'teams' ? (
          <div className="space-y-3">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No teams registered yet</p>
                </CardContent>
              </Card>
            ) : (
              teams.map((team) => (
                <Card key={team.id}>
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {team.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{team.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          Owner: {team.owner_name} · {team.budget} pts budget
                        </p>
                      </div>
                      {expandedTeam === team.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedTeam === team.id && (
                      <div className="px-4 pb-4 border-t pt-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-secondary rounded-lg p-3">
                            <span className="text-xs text-muted-foreground uppercase">Budget</span>
                            <p className="text-sm font-bold">{team.budget} pts</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-3">
                            <span className="text-xs text-muted-foreground uppercase">Registered</span>
                            <p className="text-sm font-bold">
                              {new Date(team.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {players.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No players interested yet</p>
                </CardContent>
              </Card>
            ) : (
              players.map((player, i) => (
                <Card key={player.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-8">
                      #{i + 1}
                    </span>
                    {player.profile_image_url ? (
                      <img
                        src={player.profile_image_url}
                        alt={player.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold truncate">{player.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {player.role.replace('_', ' ')} · {player.base_points} pts
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={cn('text-xs', getRoleBadgeColor(player.role))}>
                        {player.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
