'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Users } from 'lucide-react'

interface Team {
  id: string
  name: string
  owner_name: string
  budget: number
  created_at: string
}

export default function TournamentTeamsPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
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

        // Fetch teams for this tournament
        const teamsRes = await fetch(`/api/auctioneers/tournaments/${tournamentId}/teams`)
        const teamsData = await teamsRes.json()

        if (teamsRes.ok) {
          setTeams(teamsData.teams || [])
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
            <p className="text-gray-400 text-sm">Registered Teams</p>
          </div>
        </div>

        {/* Teams List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Registered Teams</CardTitle>
                <CardDescription>
                  {teams.length} of {tournament.num_teams} teams registered
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Users className="h-4 w-4 mr-1" />
                {teams.length}/{tournament.num_teams}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No teams registered yet</p>
                <p className="text-sm text-gray-600 mt-2">
                  Teams will appear here once they register for this tournament
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Owner: {team.owner_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registered: {new Date(team.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {team.budget} pts
                      </div>
                      <p className="text-xs text-muted-foreground">Budget</p>
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
