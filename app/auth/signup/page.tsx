'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Trophy, User, Users, Gavel } from 'lucide-react'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'player' | 'team_owner' | 'auctioneer'>('player')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Signup failed')
        setLoading(false)
        return
      }

      // Redirect to appropriate registration page based on role
      if (role === 'player') {
        router.push('/player/register')
      } else if (role === 'team_owner') {
        router.push('/team-owner/dashboard')
      } else if (role === 'auctioneer') {
        router.push('/auctioneer/register')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>Join the cricket auction platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 6 characters
              </p>
            </div>

            <div className="space-y-3">
              <Label>I am a...</Label>
              <RadioGroup value={role} onValueChange={(value: any) => setRole(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="player" id="player" />
                  <Label htmlFor="player" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Player</div>
                      <div className="text-xs text-muted-foreground">Register to participate in auctions</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="team_owner" id="team_owner" />
                  <Label htmlFor="team_owner" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Users className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Team Owner</div>
                      <div className="text-xs text-muted-foreground">Build your team through auctions</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value="auctioneer" id="auctioneer" />
                  <Label htmlFor="auctioneer" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Gavel className="h-4 w-4" />
                    <div>
                      <div className="font-medium">Auctioneer</div>
                      <div className="text-xs text-muted-foreground">Organize and conduct auctions</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
