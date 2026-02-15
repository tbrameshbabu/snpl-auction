"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingScreen } from "@/components/screens/landing-screen";
import { useAuth } from "@/hooks/use-auth";

export default function Page() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  // Redirect authenticated users to their respective dashboards
  useEffect(() => {
    if (!loading && user && role) {
      if (role === 'player') {
        router.push('/player/dashboard');
      } else if (role === 'auctioneer') {
        router.push('/auctioneer/tournaments');
      } else if (role === 'team_owner') {
        router.push('/tournaments');
      }
    }
  }, [user, role, loading, router]);

  // Show loading or landing page for non-authenticated users
  if (loading) {
    return (
      <main className="relative max-w-lg mx-auto min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="relative max-w-lg mx-auto min-h-screen">
      <LandingScreen onNavigate={() => {}} />
    </main>
  );
}
