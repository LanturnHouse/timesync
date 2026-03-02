import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { BoostSubscription } from "@/types";

function authHeaders() {
  const token = getAccessToken();
  return token ? { token } : {};
}

export interface PlansInfo {
  per_boost_price: number;
  max_quantity: number;
  tier_thresholds: Record<string, number>;
}

/** GET /api/payments/plans/ — 부스트 단가 정보 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => apiFetch<PlansInfo>("/payments/plans/"),
    staleTime: Infinity,
  });
}

/** GET /api/payments/subscriptions/?group={groupId} — 그룹 내 전체 활성 구독 */
export function useGroupSubscriptions(groupId: string | null) {
  return useQuery({
    queryKey: ["subscriptions", groupId],
    queryFn: () =>
      apiFetch<BoostSubscription[]>(
        `/payments/subscriptions/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

/** GET /api/payments/my-subscriptions/?group={groupId} — 내 구독 목록 */
export function useMySubscriptions(groupId: string | null) {
  return useQuery({
    queryKey: ["my-subscriptions", groupId],
    queryFn: () =>
      apiFetch<BoostSubscription[]>(
        `/payments/my-subscriptions/?group=${groupId}`,
        authHeaders()
      ),
    enabled: !!groupId,
  });
}

/** POST /api/payments/prepare-billing/ */
export function usePrepareBilling() {
  return useMutation({
    mutationFn: (data: { quantity: number; group_id: string }) =>
      apiFetch<{
        customer_key: string;
        quantity: number;
        amount: number;
        order_name: string;
      }>("/payments/prepare-billing/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
  });
}

/** POST /api/payments/confirm-billing/ */
export function useConfirmBilling() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      auth_key: string;
      customer_key: string;
      quantity: number;
      group_id: string;
    }) =>
      apiFetch<BoostSubscription>("/payments/confirm-billing/", {
        method: "POST",
        body: JSON.stringify(data),
        ...authHeaders(),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", variables.group_id] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions", variables.group_id] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

/** POST /api/payments/cancel/ — 특정 구독 취소 예약 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, groupId }: { subscriptionId: string; groupId: string }) =>
      apiFetch<{ message: string; expires_at: string }>("/payments/cancel/", {
        method: "POST",
        body: JSON.stringify({ subscription_id: subscriptionId }),
        ...authHeaders(),
      }),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", groupId] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions", groupId] });
    },
  });
}
