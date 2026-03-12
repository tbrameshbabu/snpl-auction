'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit, Upload } from 'lucide-react'
import { TeamLogo } from '@/components/team-logo'

interface TeamEditModalProps {
  team: any
  onUpdate: () => void
}

export function TeamEditModal({ team, onUpdate }: TeamEditModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(team?.logo_url || '')

  const [formData, setFormData] = useState({
    name: team?.name || '',
    short_name: team?.short_name || '',
    color: team?.color || '#F4A261',
  })

  // Sync state if team data changes externally
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        short_name: team.short_name || '',
        color: team.color || '#F4A261',
      })
      setLogoUrl(team.logo_url || '')
    }
  }, [team])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('team_id', team.id)

      const response = await fetch('/api/teams/upload-logo', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setLogoUrl(data.logo_url)
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
      const response = await fetch('/api/teams/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: team.id,
          ...formData,
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
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground underline decoration-muted-foreground/30 underline-offset-2 ml-2 transition-colors"
        >
          Edit Team Details
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-4 sm:p-6 bg-slate-950 border-white/10 glass-strong w-[95vw]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-foreground">Edit Team Details</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your team logo, name, short name, and color.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
              {error}
            </div>
          )}

          {/* Team Logo */}
          <div className="space-y-2">
            <Label className="text-foreground/90">Team Logo</Label>
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer shrink-0">
                <label htmlFor={`logo-upload-${team.id}`} className="cursor-pointer">
                  <TeamLogo
                    logoUrl={logoUrl}
                    shortName={formData.short_name || team.short_name}
                    color={formData.color}
                    size="lg"
                  />
                  <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 text-white" />
                    )}
                  </div>
                </label>
                <input
                  id={`logo-upload-${team.id}`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoUpload}
                  disabled={uploading || loading}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {logoUrl ? 'Click the logo to change it.' : 'Click the logo preview to upload an image.'} JPEG, PNG or WebP, max 2 MB.
                </p>
                {uploading && (
                  <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`name-${team.id}`} className="text-foreground/90">Team Name *</Label>
            <Input
              id={`name-${team.id}`}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              className="bg-white/5 border-white/10 focus-visible:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`short_name-${team.id}`} className="text-foreground/90">Short Name (2-3 chars) *</Label>
            <Input
              id={`short_name-${team.id}`}
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
              maxLength={3}
              required
              disabled={loading}
              className="bg-white/5 border-white/10 focus-visible:ring-blue-500 uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`color-${team.id}`} className="text-foreground/90">Team Color *</Label>
            <div className="flex gap-3">
              <Input
                id={`color-picker-${team.id}`}
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                disabled={loading}
                className="w-14 h-10 p-1 bg-white/5 border-white/10 rounded-md cursor-pointer"
              />
              <Input
                id={`color-${team.id}`}
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="#000000"
                required
                disabled={loading}
                className="flex-1 bg-white/5 border-white/10 focus-visible:ring-blue-500 uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 sm:pt-6">
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
              className="flex-1 bg-blue-500 text-white hover:bg-blue-600 font-bold"
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
