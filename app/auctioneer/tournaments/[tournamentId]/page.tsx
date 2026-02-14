'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, Users, Trophy, Clock, ArrowLeft, Play, Settings, CalendarDays, Edit, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

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
  created_at: string
}

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [error, setError] = useState('')
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`/api/auctioneers/tournaments/${tournamentId}`)
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

    fetchTournament()
  }, [tournamentId])

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const response = await fetch(`/api/auctioneers/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })

      if (response.ok) {
        const data = await response.json()
        setTournament(data.tournament)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to publish tournament')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setPublishing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      draft: { bg: 'bg-gray-500/15', text: 'text-gray-500', label: 'DRAFT' },
      published: { bg: 'bg-blue-500/15', text: 'text-blue-500', label: 'PUBLISHED' },
      live: { bg: 'bg-green-500/15', text: 'text-green-500', label: 'LIVE' },
      completed: { bg: 'bg-purple-500/15', text: 'text-purple-500', label: 'COMPLETED' }
    }
    const badge = badges[status as keyof typeof badges] || badges.draft
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', badge.bg, badge.text)}>
        {badge.label}
      </span>
    )
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-5">
        <div className="glass rounded-xl p-6 max-w-md mx-auto mt-20">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/auctioneer/tournaments')} className="w-full">
            Back to Tournaments
          </Button>
        </div>
      </div>
    )
  }

  if (!tournament) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-24">
      {/* Header */}
      <header className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/auctioneer/tournaments')}
              className="h-9 w-9 rounded-lg glass flex items-center justify-center"
            >
              <ArrowLeft className="h-4.5 w-4.5 text-muted-foreground" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">
              Tournament
            </h1>
          </div>
          <button
            type="button"
            className="h-9 w-9 rounded-lg glass flex items-center justify-center"
          >
            <Settings className="h-4.5 w-4.5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          Manage your tournament
        </p>
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
            <p className="text-xs text-muted-foreground mb-3">
              {tournament.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {format(new Date(tournament.auction_date), 'MMM dd')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{tournament.auction_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {tournament.num_teams} teams
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {tournament.status === 'draft' && (
              <>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold"
                >
                  {publishing ? 'Publishing...' : 'Publish Tournament'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/edit`)}
                  className="w-full border-border text-foreground hover:bg-secondary bg-transparent"
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit Tournament
                </Button>
              </>
            )}
            
            {(tournament.status === 'published' || tournament.status === 'live') && (
              <>
                <Button
                  size="sm"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/teams`)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 font-semibold"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Registered Teams
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/players`)}
                  className="w-full border-border text-foreground hover:bg-secondary bg-transparent"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View Player Pool
                </Button>
                {tournament.status === 'published' && (
                  <Button
                    size="sm"
                    onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}/auction`)}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold"
                  >
                    <Play className="h-3.5 w-3.5 mr-1" />
                    Start Auction
                  </Button>
                )}
              </>
            )}

            {tournament.status === 'live' && (
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 font-semibold"
              >
                <Play className="h-3.5 w-3.5 mr-1" />
                Go to Auction Control
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Details */}
      <div className="px-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Tournament Information</h2>
        
        <div className="glass rounded-xl p-4 space-y-3">
          {/* Budget */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                <Trophy className="h-4.5 w-4.5 text-yellow-500" />
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
              <div className="h-9 w-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-purple-500" />
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
              <div className="h-9 w-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
                <Clock className="h-4.5 w-4.5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-semibold text-foreground">{tournament.duration_minutes} minutes</p>
              </div>
            </div>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Calendar className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(tournament.created_at), 'PPP')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-5 mt-4">
          <div className="glass rounded-xl p-4 bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
