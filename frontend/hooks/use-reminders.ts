import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { EventReminder } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useReminders(eventId?: string | null) {
  return useQuery({
    queryKey: ["reminders", eventId],
    queryFn: () => {
      const params = eventId ? `?event=${eventId}` : "";
      return apiFetch<EventReminder[]>(`/reminders/${params}`, authHeaders());
    },
    enabled: !!eventId,
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      remindBeforeMinutes,
    }: {
      eventId: string;
      remindBeforeMinutes: number;
    }) =>
      apiFetch<EventReminder>("/reminders/", {
        method: "POST",
        body: JSON.stringify({
          event: eventId,
          remind_before_minutes: remindBeforeMinutes,
        }),
        ...authHeaders(),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reminders", variables.eventId],
      });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reminderId,
      eventId,
    }: {
      reminderId: number;
      eventId: string;
    }) =>
      apiFetch<void>(`/reminders/${reminderId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["reminders", variables.eventId],
      });
    },
  });
}
