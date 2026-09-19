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

/**
 * Polls /api/auction/[id]/state on a fixed schedule.
 * - The interval is created once per (tournamentId, pollIntervalMs) and is never
 *   reset by responses, so refresh cadence is stable.
 * - At most one request is in flight; a tick that arrives while a request is
 *   pending is skipped rather than overlapping.
 * - Each request carries a sequence number; responses older than the latest
 *   applied one are discarded, so state never moves backwards.
 * - Requests are aborted on unmount / id change.
 */
export function useAuctionState(
  tournamentId: string,
  { pollIntervalMs = 0, enabled = true }: UseAuctionStateOptions = {}
): UseAuctionStateResult {
  const [state, setState] = useState<AuctionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const seqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const seq = ++seqRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;

    const run = (async () => {
      try {
        const res = await fetch(`/api/auction/${tournamentId}/state`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (controller.signal.aborted || seq < appliedSeqRef.current) return;
        if (!res.ok) {
          setError(await readApiError(res, "Failed to load auction state"));
          return;
        }
        const data = (await res.json()) as AuctionState;
        if (controller.signal.aborted || seq < appliedSeqRef.current) return;
        appliedSeqRef.current = seq;
        setState(data);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(toErrorMessage(err, "Failed to load auction state"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [tournamentId]);

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void load();
    const timer = pollIntervalMs > 0 ? setInterval(() => void load(), pollIntervalMs) : null;
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

  return { state, loading, error, lastUpdated, refresh };
}
