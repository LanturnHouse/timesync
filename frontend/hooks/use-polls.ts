import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { PaginatedResponse, Poll } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function usePolls(groupId: string | null) {
  return useQuery({
    queryKey: ["polls", groupId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Poll>>(
        `/polls/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

export function usePoll(pollId: string | null) {
  return useQuery({
    queryKey: ["polls", "detail", pollId],
    queryFn: () =>
      apiFetch<Poll>(`/polls/${pollId}/`, authHeaders()),
    enabled: !!pollId,
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      group: string;
      event?: string | null;
      question: string;
      options: { text: string; order?: number }[];
      is_multiple_choice?: boolean;
      closes_at?: string | null;
    }) =>
      apiFetch<Poll>("/polls/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pollId,
      ...data
    }: {
      pollId: string;
      question?: string;
      is_multiple_choice?: boolean;
      closes_at?: string | null;
    }) =>
      apiFetch<Poll>(`/polls/${pollId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) =>
      apiFetch(`/polls/${pollId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      apiFetch(`/polls/${pollId}/vote/`, {
        method: "POST",
        body: JSON.stringify({ option_id: optionId }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}

export function useUnvote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      apiFetch(`/polls/${pollId}/unvote/`, {
        method: "POST",
        body: JSON.stringify({ option_id: optionId }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["polls"] });
    },
  });
}
