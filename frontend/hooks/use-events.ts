import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Event, EventLog, PaginatedResponse } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useCalendarEvents(
  startAfter?: string,
  endBefore?: string,
  categoryFilter?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ["events", "calendar", startAfter, endBefore, categoryFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startAfter) params.set("start_after", startAfter);
      if (endBefore) params.set("end_before", endBefore);
      if (categoryFilter) params.set("category", categoryFilter);
      if (search) params.set("search", search);
      const qs = params.toString();
      return apiFetch<Event[]>(`/events/calendar/${qs ? `?${qs}` : ""}`, authHeaders());
    },
    enabled: !!startAfter && !!endBefore,
  });
}

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: () =>
      apiFetch<PaginatedResponse<Event>>("/events/", authHeaders()),
  });
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ["events", id],
    queryFn: () => apiFetch<Event>(`/events/${id}/`, authHeaders()),
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Event>) =>
      apiFetch<Event>("/events/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recurrence_scope,
      ...data
    }: Partial<Event> & { id: string; recurrence_scope?: string }) =>
      apiFetch<Event>(`/events/${id}/`, {
        method: "PATCH",
        body: JSON.stringify(recurrence_scope ? { ...data, recurrence_scope } : data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      recurrence_scope,
      recurrence_id,
    }: {
      id: string;
      recurrence_scope?: string;
      recurrence_id?: string;
    }) => {
      const params = new URLSearchParams();
      if (recurrence_scope) params.set("recurrence_scope", recurrence_scope);
      if (recurrence_id) params.set("recurrence_id", recurrence_id);
      const qs = params.toString();
      return apiFetch<void>(`/events/${id}/${qs ? `?${qs}` : ""}`, {
        method: "DELETE",
        ...authHeaders(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["events", "templates"],
    queryFn: () =>
      apiFetch<Event[]>("/events/templates/", authHeaders()),
  });
}

export function useSaveAsTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) =>
      apiFetch<Event>(`/events/${eventId}/save-as-template/`, {
        method: "POST",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      ...data
    }: {
      templateId: string;
      title?: string;
      start_at?: string;
      end_at?: string;
    }) =>
      apiFetch<Event>(`/events/${templateId}/create-from-template/`, {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useShareEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      groupId,
      action,
    }: {
      eventId: string;
      groupId: string;
      action: "share" | "unshare";
    }) =>
      apiFetch(`/events/${eventId}/share/`, {
        method: action === "share" ? "POST" : "DELETE",
        body: JSON.stringify({ group_id: groupId }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useRSVP() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      status,
    }: {
      eventId: string;
      status: "accepted" | "declined" | "tentative" | null;
    }) =>
      apiFetch(`/events/${eventId}/rsvp/`, {
        method: status ? "POST" : "DELETE",
        ...(status ? { body: JSON.stringify({ status }) } : {}),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useScheduleSummary(period: "today" | "week" | "month") {
  return useQuery({
    queryKey: ["events", "summary", period],
    queryFn: () =>
      apiFetch<{ summary: string; period: string; event_count: number }>(
        `/events/summary/?period=${period}`,
        authHeaders(),
      ),
    staleTime: 3 * 60 * 1000, // 3분 캐시
    retry: false,
  });
}

export function useEventLogs(eventId: string | null) {
  return useQuery({
    queryKey: ["events", eventId, "logs"],
    queryFn: () => apiFetch<EventLog[]>(`/events/${eventId}/logs/`, authHeaders()),
    enabled: !!eventId,
  });
}

export function useChangeEventStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: "confirmed" | "tentative" }) =>
      apiFetch<Event>(`/events/${eventId}/change-status/`, {
        method: "POST",
        body: JSON.stringify({ status }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useAvailability(
  groupId?: string,
  start?: string,
  end?: string,
) {
  return useQuery({
    queryKey: ["availability", groupId, start, end],
    queryFn: () => {
      const params = new URLSearchParams({
        group_id: groupId!,
        start: start!,
        end: end!,
      });
      return apiFetch<import("@/types").AvailabilityData>(
        `/events/availability/?${params}`,
        authHeaders(),
      );
    },
    enabled: !!groupId && !!start && !!end,
  });
}
