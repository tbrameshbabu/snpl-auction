"use client";

import { Home, UserPlus, Heart, Shield, LayoutDashboard, Gavel, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "landing", label: "Home", icon: Home },
  { id: "register", label: "Register", icon: UserPlus },
  { id: "interest", label: "Player", icon: Heart },
  { id: "team-interest", label: "Team", icon: Shield },
  { id: "dashboard", label: "Manage", icon: LayoutDashboard },
  { id: "bidding", label: "Bid", icon: Gavel },
  { id: "results", label: "Results", icon: Trophy },
];

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export function BottomNav({ activeScreen, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all duration-200 min-w-0",
                isActive
                  ? "text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--gold))]"
                )}
              />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
