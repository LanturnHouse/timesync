import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { BoostSubscription, SubscriptionPlan } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

/** GET /api/payments/plans/ — 구독 플랜 목록 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => apiFetch<SubscriptionPlan[]>("/payments/plans/"),
    staleTime: Infinity, // 정적 데이터
  });
}

/** GET /api/payments/subscription/?group={groupId} — 그룹 구독 정보 */
export function useGroupSubscription(groupId: string | null) {
  return useQuery({
    queryKey: ["subscription", groupId],
    queryFn: () =>
      apiFetch<BoostSubscription | null>(
        `/payments/subscription/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

/** POST /api/payments/prepare-billing/ */
export function usePrepareBilling() {
  return useMutation({
    mutationFn: (data: { plan: string; group_id: string }) =>
      apiFetch<{ customer_key: string; plan: string; amount: number; order_name: string }>(
        "/payments/prepare-billing/",
        {
          method: "POST",
          body: JSON.stringify(data),
          ...authHeaders(),
        }
      ),
  });
}

/** POST /api/payments/confirm-billing/ */
export function useConfirmBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      auth_key: string;
      customer_key: string;
      plan: string;
      group_id: string;
    }) =>
      apiFetch<BoostSubscription>("/payments/confirm-billing/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", variables.group_id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

/** POST /api/payments/cancel/ */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      apiFetch<{ message: string; expires_at: string }>("/payments/cancel/", {
        method: "POST",
        body: JSON.stringify({ group_id: groupId }),
        ...authHeaders(),
      }),
    onSuccess: (_, groupId) => {
      queryClient.invalidateQueries({ queryKey: ["subscription", groupId] });
    },
  });
}
