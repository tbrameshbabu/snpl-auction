'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit } from 'lucide-react'

interface AuctioneerEditProfileModalProps {
  auctioneer: any
  onUpdate: () => void
}

export function AuctioneerEditProfileModal({ auctioneer, onUpdate }: AuctioneerEditProfileModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: auctioneer?.name || '',
    organization: auctioneer?.organization || '',
    phone: auctioneer?.phone || '',
  })

  // Sync state if auctioneer data changes externally
  useEffect(() => {
    if (auctioneer) {
      setFormData({
        name: auctioneer.name || '',
        organization: auctioneer.organization || '',
        phone: auctioneer.phone || '',
      })
    }
  }, [auctioneer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auctioneers/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
      <DialogContent className="sm:max-w-[425px] p-4 sm:p-6 bg-slate-950 border-white/10 glass-strong w-[95vw]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold text-foreground">Edit Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your auctioneer contact info and organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground/90">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              className="bg-white/5 border-white/10 focus-visible:ring-gold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization" className="text-foreground/90">Organization</Label>
            <Input
              id="organization"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              disabled={loading}
              className="bg-white/5 border-white/10 focus-visible:ring-gold"
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
              className="bg-white/5 border-white/10 focus-visible:ring-gold"
            />
          </div>

          <div className="flex gap-3 pt-4 sm:pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1 border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 bg-gold text-background hover:bg-gold/90 font-bold"
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
