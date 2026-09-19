"use client";

import { User } from "lucide-react";
import type { AuctionTournamentPlayer } from "@/components/auction/auction-state";

export function PlayerCard({ player }: { player: AuctionTournamentPlayer }) {
  const profile = player.players;
  return (
    <div className="glass rounded-2xl p-5 border border-gold/25">
      <div className="flex items-start gap-4">
        {profile?.profile_image_url ? (
          <img src={profile.profile_image_url} alt={profile.name} className="h-20 w-20 rounded-xl object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Up for auction</p>
          <h2 className="mt-1 truncate text-2xl font-bold">{profile?.name ?? "Player"}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="status-chip bg-gold/15 text-gold">{profile?.role?.replaceAll("_", " ") ?? "Player"}</span>
            {profile?.rating != null && <span className="status-chip bg-secondary text-muted-foreground">Rating {profile.rating}</span>}
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
        <div><p className="eyebrow">Base</p><p className="numeric text-xl font-bold text-gold">{player.base_price}</p></div>
        <div><p className="eyebrow">Batting</p><p className="text-sm font-semibold">{profile?.batting_hand ?? "—"}</p></div>
        <div><p className="eyebrow">Bowling</p><p className="text-sm font-semibold">{profile?.bowling_hand ?? "—"}</p></div>
      </div>
    </div>
  );
}
