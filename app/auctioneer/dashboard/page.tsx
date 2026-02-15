'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { AppHeader } from '@/components/app-header'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Plus,
  Calendar,
  Users,
  Trophy,
  Zap,
  Star,
  ChevronRight,
  Clock,
  Wallet,
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

export default function AuctioneerDashboardPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      const fetched = data.tournaments || []
      setTournaments(fetched)
      if (fetched.length > 0) setExpandedId(fetched[0].id)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-neon'
      case 'live': return 'text-destructive'
      case 'completed': return 'text-muted-foreground'
      case 'draft': return 'text-gold'
      default: return 'text-gold'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'published': return 'bg-neon/15'
      case 'live': return 'bg-destructive/15'
      case 'completed': return 'bg-secondary'
      case 'draft': return 'bg-gold/15'
      default: return 'bg-gold/15'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'published': return 'Open'
      case 'live': return 'Live'
      case 'completed': return 'Done'
      case 'draft': return 'Draft'
      default: return status
    }
  }

  const draftCount = tournaments.filter(t => t.status === 'draft').length
  const publishedCount = tournaments.filter(t => t.status === 'published').length
  const liveCount = tournaments.filter(t => t.status === 'live').length

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <AppHeader />

      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.08),transparent_60%)]" />
        <div className="relative px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center">
              <Zap className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Auctioneer Dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage your tournaments and auctions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Stats */}
      <section className="px-5 py-4" aria-label="Tournament summary">
        <div className="grid grid-cols-4 gap-2">
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-foreground">
              {tournaments.length}
            </span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Star className="h-4 w-4 text-gold" />
            <span className="text-lg font-bold text-gold">
              {draftCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Draft</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-neon" />
            <span className="text-lg font-bold text-neon">
              {publishedCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Open</span>
          </div>
          <div className="glass rounded-xl p-3 flex flex-col items-center gap-1">
            <Zap className="h-4 w-4 text-destructive" />
            <span className="text-lg font-bold text-destructive">
              {liveCount}
            </span>
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>
      </section>

      {/* Create Button */}
      <div className="px-5 mb-4">
        <Button
          size="lg"
          onClick={() => router.push('/auctioneer/tournaments/create')}
          className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Create New Tournament
        </Button>
      </div>

      {/* Section Heading */}
      <div className="px-5 mb-3">
        <h2 className="text-lg font-bold text-foreground">
          My Tournaments
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          All tournaments you&apos;ve created
        </p>
      </div>

      {/* Tournament List */}
      <section className="px-5 flex flex-col gap-3" aria-label="Tournaments">
        {tournaments.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-muted-foreground">
              No Tournaments Yet
            </h3>
            <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
              Create your first tournament to get started
            </p>
            <Button
              onClick={() => router.push('/auctioneer/tournaments/create')}
              className="bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Tournament
            </Button>
          </div>
        ) : (
          tournaments.map((tournament) => {
            const isExpanded = expandedId === tournament.id
            const auctionDate = new Date(tournament.auction_date)

            return (
              <div
                key={tournament.id}
                className="glass rounded-xl overflow-hidden transition-all duration-300"
              >
                {/* Card Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="h-11 w-11 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {tournament.title}
                      </h3>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                          getStatusBg(tournament.status),
                          getStatusColor(tournament.status)
                        )}
                      >
                        {getStatusLabel(tournament.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {auctionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {tournament.auction_time && ` at ${tournament.auction_time}`}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0",
                      isExpanded && "rotate-90"
                    )}
                  />
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-slide-in-right">
                    {tournament.description && (
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        {tournament.description}
                      </p>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                          <p className="text-sm font-bold text-foreground">
                            {auctionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gold shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                          <p className="text-sm font-bold text-foreground">
                            {tournament.auction_time || '—'}
                          </p>
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

                    {/* Manage Button */}
                    <Button
                      size="lg"
                      onClick={() => router.push(`/auctioneer/tournaments/${tournament.id}`)}
                      className="w-full bg-gold/15 text-gold hover:bg-gold/25 font-semibold"
                    >
                      <ChevronRight className="h-4 w-4 mr-1.5" />
                      Manage Tournament
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      {/* Info Banner */}
      <section className="px-5 py-6">
        <div className="glass rounded-xl p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-gold shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              How It Works
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Create a tournament, publish it for players and team owners to register,
              then start the live auction when you&apos;re ready. You control the bidding
              process in real-time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
