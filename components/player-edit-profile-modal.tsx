'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit, Upload } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface PlayerEditProfileModalProps {
  player: any
  onUpdate: () => void
}

export function PlayerEditProfileModal({ player, onUpdate }: PlayerEditProfileModalProps) {
  const router = useRouter()
  const { user, role } = useAuth()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [imageUrl, setImageUrl] = useState(player?.profile_image_url || '')

  const [formData, setFormData] = useState({
    name: player?.name || '',
    phone: player?.phone || '',
    role: player?.role || 'batsman',
    batting_hand: player?.batting_hand || 'right',
    bowling_hand: player?.bowling_hand || 'right',
    base_points: player?.base_points || 100,
    matches_played: player?.matches_played || 0,
    runs_scored: player?.runs_scored || 0,
    batting_average: player?.batting_average || 0,
    wickets_taken: player?.wickets_taken || 0,
    bowling_average: player?.bowling_average || 0,
    rating: player?.rating || 0,
  })

  // Sync state if player data changes externally
  useEffect(() => {
    if (player) {
      setFormData({
        name: player.name || '',
        phone: player.phone || '',
        role: player.role || 'batsman',
        batting_hand: player.batting_hand || 'right',
        bowling_hand: player.bowling_hand || 'right',
        base_points: player.base_points || 100,
        matches_played: player.matches_played || 0,
        runs_scored: player.runs_scored || 0,
        batting_average: player.batting_average || 0,
        wickets_taken: player.wickets_taken || 0,
        bowling_average: player.bowling_average || 0,
        rating: player.rating || 0,
      })
      setImageUrl(player.profile_image_url || '')
    }
  }, [player])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/players/upload-image', {
        method: 'POST',
        body: uploadFormData,
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
      const response = await fetch('/api/players/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          profile_image_url: imageUrl || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Update failed')
        setLoading(false)
        return
      }

      setOpen(false)
      onUpdate() // Trigger refresh in parent
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 border-muted-foreground/30 text-muted-foreground hover:text-foreground">
          <Edit className="h-3.5 w-3.5" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto w-[95vw] p-4 sm:p-6 bg-slate-950 border-white/10 glass-strong">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-foreground">Edit Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your player statistics and contact info.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
              {error}
            </div>
          )}

          {/* Profile Image */}
          <div className="space-y-3">
            <Label className="text-foreground/90 font-semibold">Profile Image</Label>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <img src={imageUrl} alt="Profile" className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-gold/40 shadow-xl" />
              ) : (
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploading || loading}
                  className="bg-transparent border-white/10 h-10 file:text-foreground file:bg-white/5 file:border-0 file:rounded-md file:px-3 file:py-1 file:mr-3 hover:file:bg-white/10"
                />
                {uploading && <p className="text-xs text-neon mt-2 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground/90">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-neon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground/90">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-neon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-foreground/90">Playing Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: any) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 focus:ring-neon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="batsman">Batsman</SelectItem>
                  <SelectItem value="bowler">Bowler</SelectItem>
                  <SelectItem value="all_rounder">All Rounder</SelectItem>
                  <SelectItem value="wicket_keeper">Wicket Keeper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batting_hand" className="text-foreground/90">Batting Hand *</Label>
              <Select
                value={formData.batting_hand}
                onValueChange={(value: any) => setFormData({ ...formData, batting_hand: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 focus:ring-neon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bowling_hand" className="text-foreground/90">Bowling Hand *</Label>
              <Select
                value={formData.bowling_hand}
                onValueChange={(value: any) => setFormData({ ...formData, bowling_hand: value })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 focus:ring-neon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_points" className="text-foreground/90">Base Points</Label>
              <Input
                id="base_points"
                type="number"
                value={formData.base_points}
                onChange={(e) => setFormData({ ...formData, base_points: parseInt(e.target.value) })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-neon"
              />
            </div>

            <div className="space-y-2 border-t border-white/10 sm:col-span-2 pt-4 mt-2">
              <h4 className="font-semibold text-foreground mb-2 text-sm">Career Statistics</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="matches_played" className="text-muted-foreground text-xs">Matches</Label>
              <Input
                id="matches_played"
                type="number"
                value={formData.matches_played}
                onChange={(e) => setFormData({ ...formData, matches_played: parseInt(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="runs_scored" className="text-muted-foreground text-xs">Runs</Label>
              <Input
                id="runs_scored"
                type="number"
                value={formData.runs_scored}
                onChange={(e) => setFormData({ ...formData, runs_scored: parseInt(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batting_average" className="text-muted-foreground text-xs">Batting Avg</Label>
              <Input
                id="batting_average"
                type="number"
                step="0.01"
                value={formData.batting_average}
                onChange={(e) => setFormData({ ...formData, batting_average: parseFloat(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wickets_taken" className="text-muted-foreground text-xs">Wickets</Label>
              <Input
                id="wickets_taken"
                type="number"
                value={formData.wickets_taken}
                onChange={(e) => setFormData({ ...formData, wickets_taken: parseInt(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bowling_average" className="text-muted-foreground text-xs">Bowling Avg</Label>
              <Input
                id="bowling_average"
                type="number"
                step="0.01"
                value={formData.bowling_average}
                onChange={(e) => setFormData({ ...formData, bowling_average: parseFloat(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating" className="text-muted-foreground text-xs">Rating (0-10)</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                disabled={loading}
                className="bg-white/5 border-white/10 focus-visible:ring-gold"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-white/10 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading || uploading}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="flex-1 bg-neon text-background hover:bg-neon/90 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
