import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { Boost, PaginatedResponse } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export function useBoosts(groupId: string | null) {
  return useQuery({
    queryKey: ["boosts", groupId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Boost>>(
        `/boosts/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

export function useCreateBoost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<Boost>("/boosts/", {
        method: "POST",
        body: JSON.stringify({ group: groupId }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boosts"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
