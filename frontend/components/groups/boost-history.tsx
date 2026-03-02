"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGroupSubscription, useCancelSubscription } from "@/hooks/use-subscriptions";
import { SubscriptionDialog } from "./subscription-dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const TIER_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  starter: { label: "Starter", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  lv1:     { label: "Level 1", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  lv2:     { label: "Level 2", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  lv3:     { label: "Level 3", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
};

const TIER_PERKS: Record<string, { label: string; unlocked: boolean }[]> = {
  starter: [
    { label: "최대 10명", unlocked: true },
    { label: "그룹 캘린더 공유", unlocked: true },
    { label: "투표 최대 3개", unlocked: true },
    { label: "웹훅 연동", unlocked: false },
    { label: "Availability View", unlocked: false },
    { label: "무제한 인원", unlocked: false },
  ],
  lv1: [
    { label: "최대 25명", unlocked: true },
    { label: "그룹 캘린더 공유", unlocked: true },
    { label: "투표 무제한", unlocked: true },
    { label: "웹훅 2개", unlocked: true },
    { label: "Availability View", unlocked: false },
    { label: "무제한 인원", unlocked: false },
  ],
  lv2: [
    { label: "최대 50명", unlocked: true },
    { label: "그룹 캘린더 공유", unlocked: true },
    { label: "투표 무제한", unlocked: true },
    { label: "웹훅 5개", unlocked: true },
    { label: "Availability View", unlocked: true },
    { label: "무제한 인원", unlocked: false },
  ],
  lv3: [
    { label: "무제한 인원", unlocked: true },
    { label: "그룹 캘린더 공유", unlocked: true },
    { label: "투표 무제한", unlocked: true },
    { label: "웹훅 15개", unlocked: true },
    { label: "Availability View", unlocked: true },
    { label: "우선 지원", unlocked: true },
  ],
};

interface BoostHistoryProps {
  groupId: string;
  boostCount: number;
  tier: string;
  memberCount?: number;
  maxMembers?: number | null;
  isAdmin?: boolean;
  groupName?: string;
}

export function BoostHistory({
  groupId,
  boostCount,
  tier,
  memberCount = 0,
  maxMembers,
  isAdmin = false,
  groupName = "그룹",
}: BoostHistoryProps) {
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: subscription, isLoading } = useGroupSubscription(groupId);
  const cancelSubscription = useCancelSubscription();

  const tierInfo = TIER_CONFIG[tier] ?? TIER_CONFIG.starter;
  const perks = TIER_PERKS[tier] ?? TIER_PERKS.starter;

  const handleCancelConfirm = () => {
    cancelSubscription.mutate(groupId, {
      onSuccess: (data) => {
        toast.success(data.message);
        setShowCancelDialog(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "취소 중 오류가 발생했습니다.");
      },
    });
  };

  const expiresAt = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("ko-KR")
    : null;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">그룹 구독</h3>
            <Badge className={tierInfo.color}>{tierInfo.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            총 {boostCount}회 청구 완료
          </p>
        </div>

        {/* 구독 버튼 (어드민만) */}
        {isAdmin && (
          <div>
            {!subscription || subscription.status === "expired" || subscription.status === "cancelled" ? (
              <Button onClick={() => setShowSubscribeDialog(true)} size="sm">
                <Zap className="mr-2 h-4 w-4" />
                구독하기
              </Button>
            ) : subscription.status === "active" && !subscription.cancel_at_period_end ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelSubscription.isPending}
              >
                구독 취소
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* 구독 상태 배너 */}
      {isLoading ? (
        <Skeleton className="h-16 rounded-lg" />
      ) : subscription ? (
        <div className="rounded-lg border p-4 space-y-2">
          {subscription.status === "active" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  {TIER_CONFIG[subscription.plan]?.label ?? subscription.plan} 구독 중
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {subscription.cancel_at_period_end ? (
                  <span className="text-orange-500 font-medium">
                    {expiresAt}에 종료 예정
                  </span>
                ) : (
                  <span>다음 결제일: {expiresAt}</span>
                )}
              </div>
            </div>
          )}

          {subscription.status === "past_due" && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">결제 실패</p>
                <p className="text-xs text-muted-foreground">
                  카드 정보를 확인해주세요. 3일 내 해결되지 않으면 구독이 만료되고 티어가 Starter로 초기화됩니다.
                </p>
              </div>
            </div>
          )}

          {(subscription.status === "cancelled" || subscription.status === "expired") && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircleIcon className="h-4 w-4" />
              <span>구독이 {subscription.status === "cancelled" ? "취소" : "만료"}되었습니다.</span>
            </div>
          )}
        </div>
      ) : tier === "starter" ? (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          아직 구독하지 않았습니다.{" "}
          {isAdmin && (
            <button
              className="text-primary underline-offset-4 hover:underline"
              onClick={() => setShowSubscribeDialog(true)}
            >
              구독하기
            </button>
          )}
        </div>
      ) : null}

      {/* 멤버 현황 */}
      {maxMembers != null && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>멤버 현황</span>
            <span>{memberCount} / {maxMembers}명</span>
          </div>
          <Progress value={Math.min(100, (memberCount / maxMembers) * 100)} className="h-2" />
        </div>
      )}

      <Separator />

      {/* 티어 혜택 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">현재 티어 혜택</h4>
        <div className="space-y-1.5">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {perk.unlocked ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={perk.unlocked ? "text-foreground" : "text-muted-foreground"}>
                {perk.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* 결제 내역 */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">결제 내역</h4>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)
        ) : !subscription || subscription.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">결제 내역이 없습니다.</p>
        ) : (
          subscription.payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    payment.status === "success" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span className="text-sm">
                  ₩{payment.amount.toLocaleString()}
                </span>
                {payment.status === "failed" && (
                  <Badge variant="destructive" className="text-xs">실패</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(payment.created_at).toLocaleDateString("ko-KR")}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 구독 Dialog */}
      <SubscriptionDialog
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
        groupId={groupId}
        groupName={groupName}
      />

      {/* 취소 확인 Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 구독 기간({expiresAt})까지는 티어가 유지됩니다.
              기간 종료 후 그룹 티어가 Starter로 변경됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              취소 예약
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// X 아이콘 인라인 컴포넌트
function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}
