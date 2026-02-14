'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Loader2, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function CreateTournamentPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    auction_date: undefined as Date | undefined,
    auction_time: '',
    duration_minutes: 120,
    num_teams: 8,
    num_players_per_team: 11,
    min_players_per_team: 8,
    budget_per_team: 1000,
    player_list_type: 'system_generated' as 'system_generated' | 'custom',
  })

  useEffect(() => {
    if (!authLoading && (!user || role !== 'auctioneer')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auctioneers/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          auction_date: formData.auction_date ? format(formData.auction_date, 'yyyy-MM-dd') : '',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create tournament')
        setLoading(false)
        return
      }

      router.push(`/auctioneer/tournaments/${data.tournament.id}`)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Tournament</CardTitle>
            <CardDescription>Set up a new cricket auction tournament</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Tournament Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="e.g., Summer Cricket League 2024"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={loading}
                  placeholder="Brief description of the tournament"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Auction Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.auction_date && "text-muted-foreground"
                        )}
                        disabled={loading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.auction_date ? (
                          format(formData.auction_date, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.auction_date}
                        onSelect={(date) => setFormData({ ...formData, auction_date: date })}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auction_time">Auction Time *</Label>
                  <Input
                    id="auction_time"
                    type="time"
                    value={formData.auction_time}
                    onChange={(e) => setFormData({ ...formData, auction_time: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

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
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget_per_team">Budget Per Team (Points) *</Label>
                  <Input
                    id="budget_per_team"
                    type="number"
                    min="100"
                    value={formData.budget_per_team}
                    onChange={(e) => setFormData({ ...formData, budget_per_team: parseInt(e.target.value) })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="num_players_per_team">Players Per Team *</Label>
                  <Input
                    id="num_players_per_team"
                    type="number"
                    min="4"
                    max="20"
                    value={formData.num_players_per_team}
                    onChange={(e) => setFormData({ ...formData, num_players_per_team: parseInt(e.target.value) })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_players_per_team">Minimum Players Per Team *</Label>
                  <Input
                    id="min_players_per_team"
                    type="number"
                    min="1"
                    max={formData.num_players_per_team}
                    value={formData.min_players_per_team}
                    onChange={(e) => setFormData({ ...formData, min_players_per_team: parseInt(e.target.value) })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (Minutes)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="30"
                    max="480"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="player_list_type">Player List Type *</Label>
                  <Select
                    value={formData.player_list_type}
                    onValueChange={(value: any) => setFormData({ ...formData, player_list_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system_generated">System Generated</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Tournament'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/auctioneer/dashboard')}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
