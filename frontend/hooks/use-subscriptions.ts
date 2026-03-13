import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { BoostSubscription, BoostTransfer } from "@/types";

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
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions-all"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

/** GET /api/payments/my-subscriptions/ — 내 전체 구독 (그룹 필터 없음, 설정 페이지용) */
export function useAllMySubscriptions() {
  return useQuery({
    queryKey: ["my-subscriptions-all"],
    queryFn: () =>
      apiFetch<BoostSubscription[]>("/payments/my-subscriptions/", authHeaders()),
  });
}

/** POST /api/payments/transfer/ — 부스트를 다른 그룹으로 이동 예약 (3일 후 적용) */
export function useTransferBoost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      targetGroupId,
    }: {
      subscriptionId: string;
      targetGroupId: string;
    }) =>
      apiFetch<BoostTransfer>("/payments/transfer/", {
        method: "POST",
        body: JSON.stringify({
          subscription_id: subscriptionId,
          target_group_id: targetGroupId,
        }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions-all"] });
    },
  });
}

/** POST /api/payments/cancel-transfer/ — 이동 예약 취소 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) =>
      apiFetch<{ message: string }>("/payments/cancel-transfer/", {
        method: "POST",
        body: JSON.stringify({ transfer_id: transferId }),
        ...authHeaders(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions-all"] });
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
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions-all"] });
    },
  });
}
