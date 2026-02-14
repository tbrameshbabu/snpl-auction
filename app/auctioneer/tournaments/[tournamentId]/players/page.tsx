'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Users, Trophy } from 'lucide-react'

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
        // Fetch tournament details
        const tournamentRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}`)
        const tournamentData = await tournamentRes.json()

        if (!tournamentRes.ok) {
          setError(tournamentData.error || 'Failed to load tournament')
          setLoading(false)
          return
        }

        setTournament(tournamentData.tournament)

        // Fetch players interested in this tournament
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500'
      case 'bowler': return 'bg-green-500'
      case 'all_rounder': return 'bg-purple-500'
      case 'wicket_keeper': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
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
            <h1 className="text-2xl font-bold text-white">{tournament.title}</h1>
            <p className="text-gray-400 text-sm">Player Pool</p>
          </div>
        </div>

        {/* Players List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interested Players</CardTitle>
                <CardDescription>
                  {players.length} players have shown interest in this tournament
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Users className="h-4 w-4 mr-1" />
                {players.length} Players
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No players interested yet</p>
                <p className="text-sm text-gray-600 mt-2">
                  Players will appear here once they show interest in this tournament
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent"
                  >
                    {player.profile_image_url ? (
                      <img
                        src={player.profile_image_url}
                        alt={player.name}
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{player.name}</h3>
                        <Badge className={getRoleBadgeColor(player.role)}>
                          {player.role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                        <div>
                          <span className="font-medium">Base Points:</span> {player.base_points}
                        </div>
                        <div>
                          <span className="font-medium">Matches:</span> {player.matches_played}
                        </div>
                        <div>
                          <span className="font-medium">Runs:</span> {player.runs_scored}
                        </div>
                        <div>
                          <span className="font-medium">Wickets:</span> {player.wickets_taken}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs">
                        <Badge variant="outline">Bat: {player.batting_hand}</Badge>
                        <Badge variant="outline">Bowl: {player.bowling_hand}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
