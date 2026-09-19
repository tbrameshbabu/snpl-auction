"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toErrorMessage } from "@/components/shared/api-error";

export function getSafeRedirect(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.includes("\\") || new URL(value, "http://x").origin !== "http://x") return null;
  return value;
}
function LoginForm() {
  const router = useRouter(); const params = useSearchParams(); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const handleLogin = async (event: React.FormEvent) => { event.preventDefault(); setLoading(true); setError(""); try { const supabase = createClient(); const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password }); if (signInError) { setError(signInError.message); return; } const { data: userData } = await supabase.from("users").select("role").eq("id", data.user.id).single(); router.push(getSafeRedirect(params.get("redirectTo")) ?? (userData?.role === "player" ? "/player/dashboard" : userData?.role === "team_owner" ? "/team-owner/dashboard" : userData?.role === "auctioneer" ? "/auctioneer/dashboard" : "/")); } catch (err: unknown) { setError(toErrorMessage(err, "Unable to sign in")); } finally { setLoading(false); } };
  return <div className="glass w-full max-w-md rounded-2xl p-6 sm:p-8"><div className="text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold"><Trophy className="h-6 w-6" /></div><p className="eyebrow mt-5">AuctionArena</p><h1 className="mt-2 text-2xl font-bold">Welcome back</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to your auction account</p></div><form onSubmit={handleLogin} className="mt-7 space-y-4">{error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input className="bg-background/60" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input className="bg-background/60" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} /></div><Button type="submit" className="w-full bg-gold text-background hover:bg-gold/90" disabled={loading}>{loading ? "Signing in…" : "Sign In"}</Button><p className="text-center text-sm text-muted-foreground">Don&apos;t have an account? <Link href="/auth/signup" className="text-gold hover:underline">Sign up</Link></p></form></div>;
}
export default function LoginPage() { return <main className="flex min-h-screen items-center justify-center px-4 py-12"><Suspense fallback={<div className="glass h-96 w-full max-w-md animate-pulse rounded-2xl" />}><LoginForm /></Suspense></main>; }
