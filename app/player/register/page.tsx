'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PlayerRegisterPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'batsman' as 'batsman' | 'bowler' | 'all_rounder' | 'wicket_keeper',
    batting_hand: 'right' as 'right' | 'left',
    bowling_hand: 'right' as 'right' | 'left',
    base_points: 100,
    matches_played: 0,
    runs_scored: 0,
    batting_average: 0,
    wickets_taken: 0,
    bowling_average: 0,
    rating: 0,
  })

  useEffect(() => {
    if (!authLoading && (!user || role !== 'player')) {
      router.push('/auth/login')
    }
  }, [user, role, authLoading, router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/players/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed')
        setUploading(false)
        return
      }

      setImageUrl(data.url)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/players/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profile_image_url: imageUrl || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Registration failed')
        setLoading(false)
        return
      }

      router.push('/player/dashboard')
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
            <CardTitle>Player Registration</CardTitle>
            <CardDescription>Complete your player profile to participate in auctions</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {/* Profile Image */}
              <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <img src={imageUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover" />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading || loading}
                    />
                    {uploading && <p className="text-sm text-muted-foreground mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Playing Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="batsman">Batsman</SelectItem>
                      <SelectItem value="bowler">Bowler</SelectItem>
                      <SelectItem value="all_rounder">All Rounder</SelectItem>
                      <SelectItem value="wicket_keeper">Wicket Keeper</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batting_hand">Batting Hand *</Label>
                  <Select
                    value={formData.batting_hand}
                    onValueChange={(value: any) => setFormData({ ...formData, batting_hand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bowling_hand">Bowling Hand *</Label>
                  <Select
                    value={formData.bowling_hand}
                    onValueChange={(value: any) => setFormData({ ...formData, bowling_hand: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="left">Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_points">Base Points</Label>
                  <Input
                    id="base_points"
                    type="number"
                    value={formData.base_points}
                    onChange={(e) => setFormData({ ...formData, base_points: parseInt(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matches_played">Matches Played</Label>
                  <Input
                    id="matches_played"
                    type="number"
                    value={formData.matches_played}
                    onChange={(e) => setFormData({ ...formData, matches_played: parseInt(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="runs_scored">Runs Scored</Label>
                  <Input
                    id="runs_scored"
                    type="number"
                    value={formData.runs_scored}
                    onChange={(e) => setFormData({ ...formData, runs_scored: parseInt(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batting_average">Batting Average</Label>
                  <Input
                    id="batting_average"
                    type="number"
                    step="0.01"
                    value={formData.batting_average}
                    onChange={(e) => setFormData({ ...formData, batting_average: parseFloat(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wickets_taken">Wickets Taken</Label>
                  <Input
                    id="wickets_taken"
                    type="number"
                    value={formData.wickets_taken}
                    onChange={(e) => setFormData({ ...formData, wickets_taken: parseInt(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bowling_average">Bowling Average</Label>
                  <Input
                    id="bowling_average"
                    type="number"
                    step="0.01"
                    value={formData.bowling_average}
                    onChange={(e) => setFormData({ ...formData, bowling_average: parseFloat(e.target.value) })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (0-10)</Label>
                  <Input
                    id="rating"
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) })}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading || uploading}>
                {loading ? 'Registering...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
