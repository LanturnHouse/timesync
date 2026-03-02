import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Event } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useConflicts({
  startAt,
  endAt,
  excludeId,
  enabled = true,
}: {
  startAt: string;
  endAt: string;
  excludeId?: string | null;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["conflicts", startAt, endAt, excludeId],
    queryFn: () => {
      const params = new URLSearchParams({ start_at: startAt, end_at: endAt });
      if (excludeId) params.set("exclude", excludeId);
      return apiFetch<Event[]>(
        `/events/conflicts/?${params.toString()}`,
        authHeaders()
      );
    },
    enabled: enabled && !!startAt && !!endAt,
    // Stale time 5s — refresh quickly as user edits times
    staleTime: 5000,
  });
}
