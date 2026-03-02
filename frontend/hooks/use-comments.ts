import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Comment, PaginatedResponse } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useComments(eventId: string | null) {
  return useQuery({
    queryKey: ["comments", eventId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Comment>>(
        `/events/${eventId}/comments/`,
        authHeaders()
      ),
    enabled: !!eventId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, content }: { eventId: string; content: string }) =>
      apiFetch<Comment>(`/events/${eventId}/comments/`, {
        method: "POST",
        body: JSON.stringify({ content }),
        ...authHeaders(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.eventId],
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      commentId,
      content,
    }: {
      eventId: string;
      commentId: string;
      content: string;
    }) =>
      apiFetch<Comment>(`/events/${eventId}/comments/${commentId}/`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
        ...authHeaders(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.eventId],
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      commentId,
    }: {
      eventId: string;
      commentId: string;
    }) =>
      apiFetch<void>(`/events/${eventId}/comments/${commentId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["comments", variables.eventId],
      });
    },
  });
}
