'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Upload } from 'lucide-react'
import { TeamLogo } from '@/components/team-logo'

interface TeamJoinModalProps {
  tournamentTitle: string
  tournamentId: string
  defaultName: string
  defaultShortName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onJoin: (data: {
    tournament_id: string
    name: string
    short_name: string
    color: string
    logoFile: File | null
  }) => Promise<void>
}

export function TeamJoinModal({
  tournamentTitle,
  tournamentId,
  defaultName,
  defaultShortName,
  open,
  onOpenChange,
  onJoin,
}: TeamJoinModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [formData, setFormData] = useState({
    name: defaultName,
    short_name: defaultShortName,
    color: '#F4A261',
  })

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onJoin({ tournament_id: tournamentId, ...formData, logoFile })
    } catch (err: any) {
      setError(err.message || 'Failed to join auction')
      setLoading(false)
    }
  }

  const handleOpenChange = (val: boolean) => {
    if (loading) return
    if (!val) {
      setLogoFile(null)
      setLogoPreview('')
      setError('')
      setFormData({ name: defaultName, short_name: defaultShortName, color: '#F4A261' })
    }
    onOpenChange(val)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-4 sm:p-6 bg-slate-950 border-white/10 glass-strong w-[95vw]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-foreground">Register Your Team</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set up your team for <span className="text-foreground font-medium">{tournamentTitle}</span>.
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
                <label htmlFor="team-logo-upload" className="cursor-pointer">
                  <TeamLogo
                    logoUrl={logoPreview || null}
                    shortName={formData.short_name || 'T'}
                    color={formData.color}
                    size="lg"
                  />
                  <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </label>
                <input
                  id="team-logo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoSelect}
                  disabled={loading}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-w-0">
                {logoFile ? (
                  <div>
                    <p className="text-xs text-foreground truncate">{logoFile.name}</p>
                    <button
                      type="button"
                      onClick={() => { setLogoFile(null); setLogoPreview('') }}
                      className="text-xs text-destructive hover:text-destructive/80 mt-1"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click the preview to upload a team logo. JPEG, PNG or WebP, max 2 MB. (Optional)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="join-team-name" className="text-foreground/90">Team Name *</Label>
            <Input
              id="join-team-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              placeholder="e.g. Mumbai Warriors"
              className="bg-white/5 border-white/10 focus-visible:ring-blue-500"
            />
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <Label htmlFor="join-team-short" className="text-foreground/90">Short Name (2–3 chars) *</Label>
            <Input
              id="join-team-short"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value.toUpperCase() })}
              maxLength={3}
              required
              disabled={loading}
              placeholder="e.g. MW"
              className="bg-white/5 border-white/10 focus-visible:ring-blue-500 uppercase"
            />
          </div>

          {/* Team Color */}
          <div className="space-y-2">
            <Label className="text-foreground/90">Team Color *</Label>
            <div className="flex gap-3">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                disabled={loading}
                className="w-14 h-10 p-1 bg-white/5 border-white/10 rounded-md cursor-pointer"
              />
              <Input
                type="text"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="#F4A261"
                required
                disabled={loading}
                className="flex-1 bg-white/5 border-white/10 focus-visible:ring-blue-500 uppercase font-mono"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-neon text-background hover:bg-neon/90 font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : 'Join Auction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
