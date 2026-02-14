"use client";

import { useRouter } from "next/navigation";
import { Zap, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const getRoleBadgeColor = (userRole: string | null) => {
    switch (userRole) {
      case "player":
        return "bg-neon/15 text-neon";
      case "auctioneer":
        return "bg-gold/15 text-gold";
      case "team_owner":
        return "bg-blue-500/15 text-blue-400";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getRoleLabel = (userRole: string | null) => {
    switch (userRole) {
      case "player":
        return "Player";
      case "auctioneer":
        return "Auctioneer";
      case "team_owner":
        return "Team Owner";
      default:
        return "";
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: App Branding */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-lg bg-gold/15 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 text-gold" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            SNPL Auction
          </span>
        </button>

        {/* Right: User Info or Login */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-20 rounded-lg bg-secondary/60 animate-pulse" />
          ) : user ? (
            <>
              {/* Role Badge */}
              {role && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase hidden sm:inline-block",
                    getRoleBadgeColor(role)
                  )}
                >
                  {getRoleLabel(role)}
                </span>
              )}

              {/* User Email */}
              <div className="flex items-center gap-1.5">
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground max-w-[120px] truncate hidden sm:block">
                  {user.email}
                </span>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleSignOut}
                className="h-8 w-8 rounded-lg glass flex items-center justify-center hover:bg-destructive/20 transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="px-4 py-1.5 rounded-lg bg-gold/15 text-gold text-sm font-semibold hover:bg-gold/25 transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
