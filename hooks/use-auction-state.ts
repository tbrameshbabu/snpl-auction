"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuctionState } from "@/components/auction/auction-state";
import { readApiError, toErrorMessage } from "@/components/shared/api-error";

interface UseAuctionStateOptions {
  /** Poll interval in ms. 0 disables polling (a single fetch still runs). */
  pollIntervalMs?: number;
  enabled?: boolean;
}

export interface UseAuctionStateResult {
  state: AuctionState | null;
  /** True until the first successful or failed fetch completes. */
  loading: boolean;
  /** Last fetch error; cleared on the next successful fetch. */
  error: string | null;
  lastUpdated: Date | null;
  /** Fetches immediately and resolves once applied (or dropped as stale). */
  refresh: () => Promise<void>;
}

interface Snapshot {
  tournamentId: string;
  state: AuctionState | null;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Polls /api/auction/[id]/state on a fixed schedule.
 * - The interval is created once per (tournamentId, pollIntervalMs) and is never
 *   reset by responses, so refresh cadence is stable.
 * - At most one request is in flight; a tick that arrives while a request is
 *   pending is skipped rather than overlapping.
 * - Each request carries a sequence number; responses older than the latest
 *   applied one are discarded, so state never moves backwards.
 * - Requests are aborted on unmount / id change, and a snapshot is only ever
 *   exposed for the tournament it was fetched for.
 */
export function useAuctionState(
  tournamentId: string,
  { pollIntervalMs = 0, enabled = true }: UseAuctionStateOptions = {},
): UseAuctionStateResult {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  const seqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const seq = ++seqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    const isStale = () =>
      controller.signal.aborted || seq < appliedSeqRef.current;

    const fail = (message: string) =>
      setSnapshot((prev) => ({
        tournamentId,
        state: prev?.tournamentId === tournamentId ? prev.state : null,
        error: message,
        lastUpdated: prev?.tournamentId === tournamentId ? prev.lastUpdated : null,
      }));

    const run = (async () => {
      try {
        const res = await fetch(`/api/auction/${tournamentId}/state`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (isStale()) return;
        if (!res.ok) {
          const message = await readApiError(res, "Failed to load auction state");
          if (!isStale()) fail(message);
          return;
        }
        const data = (await res.json()) as AuctionState;
        if (isStale()) return;
        appliedSeqRef.current = seq;
        setSnapshot({
          tournamentId,
          state: data,
          error: null,
          lastUpdated: new Date(),
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        fail(toErrorMessage(err, "Failed to load auction state"));
      } finally {
        // A newer request may already own the refs (e.g. after an abort).
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          inFlightRef.current = null;
        }
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [tournamentId]);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const timer =
      pollIntervalMs > 0
        ? setInterval(() => void load(), pollIntervalMs)
        : null;
    return () => {
      if (timer) clearInterval(timer);
      controllerRef.current?.abort();
      controllerRef.current = null;
      inFlightRef.current = null;
    };
  }, [enabled, load, pollIntervalMs]);

  // A refresh after a mutation must not resolve with a response that was
  // requested before the mutation, so wait out any in-flight poll first.
  const refresh = useCallback(async () => {
    if (inFlightRef.current) await inFlightRef.current;
    await load();
  }, [load]);

  const current = snapshot?.tournamentId === tournamentId ? snapshot : null;
  return {
    state: current?.state ?? null,
    loading: current === null,
    error: current?.error ?? null,
    lastUpdated: current?.lastUpdated ?? null,
    refresh,
  };
}
