import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

export interface Notification {
  id: string;
  verb: string;
  message: string;
  is_read: boolean;
  target_id: string;
  actor_email: string | null;
  created_at: string;
}

interface NotificationList {
  results: Notification[];
  count: number;
}

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useNotifications() {
  return useQuery<NotificationList>({
    queryKey: ["notifications"],
    queryFn: () =>
      apiFetch<NotificationList>("/notifications/?page_size=20", authHeaders()),
    refetchInterval: 30000, // Poll every 30s as fallback
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/notifications/${id}/read/`, {
        method: "POST",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>("/notifications/read-all/", {
        method: "POST",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
