"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trophy, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getApiErrorMessage,
  toErrorMessage,
} from "@/components/shared/api-error";
import { cn } from "@/lib/utils";
type SignupRole = "player" | "team_owner";
interface SignupResponse {
  requiresEmailConfirmation?: boolean;
}
const isSignupRole = (value: string): value is SignupRole =>
  value === "player" || value === "team_owner";
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignupRole>("player");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = (await response.json()) as SignupResponse;
      if (!response.ok) {
        setError(getApiErrorMessage(data, "Signup failed"));
        return;
      }
      if (data.requiresEmailConfirmation === true) {
        setConfirmation(true);
        return;
      }
      router.push(
        role === "player" ? "/player/register" : "/team-owner/dashboard",
      );
    } catch (err: unknown) {
      setError(toErrorMessage(err, "Unable to create account"));
    } finally {
      setLoading(false);
    }
  };
  if (confirmation)
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="glass w-full max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="eyebrow mt-5">AuctionArena</p>
          <h1 className="mt-2 text-2xl font-bold">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
          <Button
            asChild
            className="mt-6 w-full bg-gold text-background hover:bg-gold/90"
          >
            <Link href="/auth/login">Back to login</Link>
          </Button>
        </div>
      </main>
    );
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <p className="eyebrow mt-5">AuctionArena</p>
          <h1 className="mt-2 text-2xl font-bold">Create account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the live sports auction platform
          </p>
        </div>
        <form onSubmit={handleSignup} className="mt-7 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              className="bg-background/60"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              className="bg-background/60"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div className="space-y-3">
            <Label>I am a…</Label>
            <RadioGroup
              value={role}
              onValueChange={(value) => {
                if (isSignupRole(value)) setRole(value);
              }}
            >
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${role === "player" ? "border-gold/60 bg-gold/5" : "border-border"}`}
              >
                <RadioGroupItem value="player" id="player" />
                <User className="h-4 w-4 text-gold" />
                <span>
                  <span className="block font-medium">Player</span>
                  <span className="text-xs text-muted-foreground">
                    Register to participate
                  </span>
                </span>
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3",
                  role === "team_owner"
                    ? "border-gold/60 bg-gold/5"
                    : "border-border",
                )}
              >
                <RadioGroupItem value="team_owner" id="team_owner" />
                <Users className="h-4 w-4 text-gold" />
                <span>
                  <span className="block font-medium">Team Owner</span>
                  <span className="text-xs text-muted-foreground">
                    Build your team through auctions
                  </span>
                </span>
              </label>
            </RadioGroup>
          </div>
          <Button
            type="submit"
            className="w-full bg-gold text-background hover:bg-gold/90"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-gold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
