import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { PaginatedResponse, Webhook, WebhookLog } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useWebhooks(groupId: string | null) {
  return useQuery({
    queryKey: ["webhooks", groupId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Webhook>>(
        `/webhooks/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      group: string;
      url: string;
      event_types: string[];
    }) =>
      apiFetch<Webhook>("/webhooks/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      webhookId,
      ...data
    }: {
      webhookId: string;
      url?: string;
      event_types?: string[];
      is_active?: boolean;
    }) =>
      apiFetch<Webhook>(`/webhooks/${webhookId}/`, {
        method: "PATCH",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (webhookId: string) =>
      apiFetch(`/webhooks/${webhookId}/`, {
        method: "DELETE",
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
  });
}

export function useWebhookLogs(webhookId: string | null) {
  return useQuery({
    queryKey: ["webhooks", "logs", webhookId],
    queryFn: () =>
      apiFetch<WebhookLog[]>(
        `/webhooks/${webhookId}/logs/`,
        authHeaders()
      ),
    enabled: !!webhookId,
  });
}
