"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandingScreen } from "@/components/screens/landing-screen";
import { RegistrationScreen } from "@/components/screens/registration-screen";
import { PlayerInterestScreen } from "@/components/screens/player-interest-screen";
import { TeamInterestScreen } from "@/components/screens/team-interest-screen";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { BiddingScreen } from "@/components/screens/bidding-screen";
import { ResultsScreen } from "@/components/screens/results-screen";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/hooks/use-auth";

type Screen = "landing" | "register" | "interest" | "team-interest" | "dashboard" | "bidding" | "results";

export default function Page() {
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>("landing");

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

  const handleNavigate = useCallback((screen: string) => {
    setActiveScreen(screen as Screen);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
      {activeScreen === "landing" && (
        <LandingScreen onNavigate={handleNavigate} />
      )}
      {activeScreen === "register" && (
        <RegistrationScreen onNavigate={handleNavigate} />
      )}
      {activeScreen === "interest" && (
        <PlayerInterestScreen onNavigate={handleNavigate} />
      )}
      {activeScreen === "team-interest" && (
        <TeamInterestScreen onNavigate={handleNavigate} />
      )}
      {activeScreen === "dashboard" && (
        <DashboardScreen onNavigate={handleNavigate} />
      )}
      {activeScreen === "bidding" && (
        <BiddingScreen tournamentId="demo" onNavigate={handleNavigate} />
      )}
      {activeScreen === "results" && (
        <ResultsScreen tournamentId="demo" onNavigate={handleNavigate} />
      )}
      <BottomNav activeScreen={activeScreen} onNavigate={handleNavigate} />
    </main>
  );
}
