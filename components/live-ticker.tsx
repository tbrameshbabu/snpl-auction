"use client";

import { Zap } from "lucide-react";

const tickerItems = [
  { id: 1, text: "Premier League Auction starts in 2h 15m", live: true },
  { id: 2, text: "Virat K. sold for 1500 pts to Royal Strikers", live: false },
  { id: 3, text: "Champions Cup Draft - 12 teams registered", live: false },
  { id: 4, text: "MS Dhoni base price set at 800 pts", live: true },
  { id: 5, text: "Thunder Hawks acquired 3 all-rounders", live: false },
  { id: 6, text: "Weekend Showdown Auction - Slots filling fast", live: true },
];

export function LiveTicker() {
  return (
    <div className="relative overflow-hidden bg-secondary/80 border-y border-border/50 py-2.5">
      <div className="flex items-center gap-2 px-3 absolute left-0 top-0 bottom-0 z-10 bg-secondary">
        <Zap className="h-3.5 w-3.5 text-gold fill-gold" />
        <span className="text-xs font-semibold text-gold uppercase tracking-wider">
          Live
        </span>
      </div>
      <div className="ml-16 flex animate-ticker">
        <div className="flex shrink-0 gap-8">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={`${item.id}-${i}`} className="flex items-center gap-2 shrink-0">
              {item.live && (
                <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse" />
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
