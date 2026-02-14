'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Calendar, Users } from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string
  auction_date: string
  auction_time: string
  status: string
  num_teams: number
  budget_per_team: number
  created_at: string
}

export default function AuctioneerTournamentsPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/api/auctioneers/tournaments')
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to load tournaments')
          setLoading(false)
          return
        }

        setTournaments(data.tournaments || [])
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    if (user && role === 'auctioneer') {
      fetchTournaments()
    }
  }, [user, role])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'published':
        return <Badge className="bg-blue-600">Published</Badge>
      case 'live':
        return <Badge className="bg-green-600">Live</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Unified App Header */}
      <AppHeader />

      <div className="max-w-6xl mx-auto space-y-6 p-4 py-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Tournaments</h1>
            <p className="text-gray-400 mt-1">Manage your cricket auction tournaments</p>
          </div>
          <Button onClick={() => router.push('/auctioneer/tournaments/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-500">
            <CardContent className="p-6">
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Tournaments List */}
        {tournaments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">No tournaments yet</h3>
                  <p className="text-gray-500 mb-4">Create your first tournament to get started</p>
                  <Button onClick={() => router.push('/auctioneer/tournaments/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tournament
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/auctioneer/tournaments/${tournament.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{tournament.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {tournament.description || 'No description'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(tournament.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(tournament.auction_date).toLocaleDateString()} at {tournament.auction_time}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{tournament.num_teams} teams · {tournament.budget_per_team} pts budget</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
