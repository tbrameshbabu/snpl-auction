'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Calendar, Users, Trophy } from 'lucide-react'

interface Tournament {
  id: string
  title: string
  description: string
  auction_date: string
  status: string
  num_teams: number
  budget_per_team: number
}

export default function AuctioneerDashboardPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
      return
    }

    if (user && role === 'auctioneer') {
      fetchTournaments()
    }
  }, [user, role, authLoading, router])

  const fetchTournaments = async () => {
    try {
      const response = await fetch('/api/auctioneers/tournaments')
      const data = await response.json()
      setTournaments(data.tournaments || [])
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'published':
        return 'default'
      case 'live':
        return 'destructive'
      case 'completed':
        return 'outline'
      default:
        return 'secondary'
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
        {/* Page Title + Create Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Auctioneer Dashboard</h1>
            <p className="text-gray-300">Manage your tournaments and auctions</p>
          </div>
          <Button onClick={() => router.push('/auctioneer/tournaments/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Tournament
          </Button>
        </div>

        {/* Tournaments */}
        <Card>
          <CardHeader>
            <CardTitle>My Tournaments</CardTitle>
            <CardDescription>All tournaments you've created</CardDescription>
          </CardHeader>
          <CardContent>
            {tournaments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>You haven't created any tournaments yet</p>
                <Button
                  onClick={() => router.push('/auctioneer/tournaments/create')}
                  className="mt-4"
                  variant="outline"
                >
                  Create Your First Tournament
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/auctioneer/tournaments/${tournament.id}`)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{tournament.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tournament.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(tournament.auction_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {tournament.num_teams} teams
                        </span>
                        <span>Budget: {tournament.budget_per_team} pts</span>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(tournament.status)}>
                      {tournament.status}
                    </Badge>
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
