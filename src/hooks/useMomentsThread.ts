import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { usePingStore } from '@/stores/pingStore';
import type { Moment } from '@/types/database';

const PAGE_SIZE = 50;

export interface ThreadPing {
  id: string;
  mine: boolean;
  photoPath: string | null;
  createdAt: number;
  /** Not yet delivered — still sitting in the offline queue. */
  queued?: boolean;
}

export type ThreadRow =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'ping'; key: string; ping: ThreadPing };

function dayLabel(date: Date, now: Date): string {
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * The history the `moments` table has always stored and nothing ever displayed.
 *
 * Realtime already tells us when a ping arrives, so the subscription invalidates
 * this query rather than this polling.
 */
export function useMomentsThread() {
  const pairId = useProfileStore((s) => s.pairId);
  const userId = useAuthStore((s) => s.user?.id);
  const isDemo = useAuthStore((s) => s.isDemo);
  const incomingPing = usePingStore((s) => s.incomingPing);
  const offlineQueue = usePingStore((s) => s.offlineQueue);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['moments', pairId],
    enabled: Boolean(pairId) && !isDemo,
    staleTime: 30_000,
    queryFn: async (): Promise<Moment[]> => {
      if (!pairId) return [];
      const { data, error } = await supabase
        .from('moments')
        .select('id, sender_id, photo_path, created_at')
        .eq('pair_id', pairId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);
      if (error) throw error;
      return (data ?? []) as Moment[];
    },
  });

  // A ping landing over Realtime is the signal to refetch.
  useEffect(() => {
    if (incomingPing) void queryClient.invalidateQueries({ queryKey: ['moments', pairId] });
  }, [incomingPing?.id, pairId, queryClient]);

  const rows = useMemo<ThreadRow[]>(() => {
    const now = new Date();

    const delivered: ThreadPing[] = (query.data ?? []).map((m) => ({
      id: m.id,
      mine: m.sender_id === userId,
      photoPath: m.photo_path,
      createdAt: new Date(m.created_at).getTime(),
    }));

    // Anything still queued is yours by definition, and has not arrived yet.
    const queued: ThreadPing[] = offlineQueue.map((entry) => ({
      id: entry.localId,
      mine: true,
      photoPath: null,
      createdAt: entry.createdAt,
      queued: true,
    }));

    const all = [...queued, ...delivered].sort((a, b) => b.createdAt - a.createdAt);

    const out: ThreadRow[] = [];
    let currentDay = '';
    for (const ping of all) {
      const date = new Date(ping.createdAt);
      const key = dayKey(date);
      if (key !== currentDay) {
        currentDay = key;
        out.push({ kind: 'day', key: `day-${key}`, label: dayLabel(date, now) });
      }
      out.push({ kind: 'ping', key: ping.id, ping });
    }
    return out;
  }, [query.data, offlineQueue, userId]);

  /** Counts for the last six days, oldest first — the header sparkline. */
  const sparkline = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = Array.from({ length: 6 }, (_, i) => ({
      mine: 0,
      theirs: 0,
      start: startOfToday - (5 - i) * 86_400_000,
    }));

    for (const m of query.data ?? []) {
      const t = new Date(m.created_at).getTime();
      const index = days.findIndex((d) => t >= d.start && t < d.start + 86_400_000);
      if (index === -1) continue;
      if (m.sender_id === userId) days[index].mine += 1;
      else days[index].theirs += 1;
    }
    return days;
  }, [query.data, userId]);

  return { rows, sparkline, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}
