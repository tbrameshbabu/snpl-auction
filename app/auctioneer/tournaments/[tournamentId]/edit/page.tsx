'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function EditTournamentPage({
  params
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = use(params)
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    auction_date: '',
    auction_time: '',
    num_teams: 8,
    budget_per_team: 1000,
  })

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

        const tournament = data.tournament
        
        // Check if tournament is in draft status
        if (tournament.status !== 'draft') {
          setError('Only draft tournaments can be edited')
          setLoading(false)
          return
        }

        setFormData({
          title: tournament.title,
          description: tournament.description || '',
          auction_date: tournament.auction_date,
          auction_time: tournament.auction_time,
          num_teams: tournament.num_teams,
          budget_per_team: tournament.budget_per_team,
        })
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'An error occurred')
        setLoading(false)
      }
    }

    fetchTournament()
  }, [tournamentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/auctioneers/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.details || 'Failed to update tournament')
        setSubmitting(false)
        return
      }

      router.push(`/auctioneer/tournaments/${tournamentId}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !formData.title) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <p className="text-red-500">{error}</p>
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Tournament</h1>
            <p className="text-gray-400 text-sm">Update tournament details</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>Update the information for your tournament</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Tournament Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Premier League Cup 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your tournament..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auction_date">Auction Date *</Label>
                  <Input
                    id="auction_date"
                    type="date"
                    value={formData.auction_date}
                    onChange={(e) => setFormData({ ...formData, auction_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auction_time">Auction Time *</Label>
                  <Input
                    id="auction_time"
                    type="time"
                    value={formData.auction_time}
                    onChange={(e) => setFormData({ ...formData, auction_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="num_teams">Number of Teams *</Label>
                  <Input
                    id="num_teams"
                    type="number"
                    min="2"
                    max="20"
                    value={formData.num_teams}
                    onChange={(e) => setFormData({ ...formData, num_teams: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_per_team">Budget per Team (Points) *</Label>
                  <Input
                    id="budget_per_team"
                    type="number"
                    min="100"
                    step="100"
                    value={formData.budget_per_team}
                    onChange={(e) => setFormData({ ...formData, budget_per_team: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/auctioneer/tournaments/${tournamentId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Tournament'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
