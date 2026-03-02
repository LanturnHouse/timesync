"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  useGroupSubscriptions,
  useMySubscriptions,
  useCancelSubscription,
} from "@/hooks/use-subscriptions";
import { SubscriptionDialog } from "./subscription-dialog";
import { AlertTriangle, CheckCircle2, Clock, Lock, Zap } from "lucide-react";
import { toast } from "sonner";
import type { BoostSubscription } from "@/types";

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  lv1:     { label: "Level 1", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  lv2:     { label: "Level 2", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  lv3:     { label: "Level 3", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
};

const NEXT_TIER_LABEL: Record<string, string> = {
  starter: "Level 1",
  lv1: "Level 2",
  lv2: "Level 3",
};

// boost count needed to reach the NEXT tier
const NEXT_THRESHOLD: Record<string, number | null> = {
  starter: 3,
  lv1: 7,
  lv2: 15,
  lv3: null,
};

// boost count at which the CURRENT tier starts
const PREV_THRESHOLD: Record<string, number> = {
  starter: 0,
  lv1: 3,
  lv2: 7,
  lv3: 15,
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
  const [cancelTarget, setCancelTarget] = useState<BoostSubscription | null>(null);

  const { data: allSubscriptions = [], isLoading: loadingAll } = useGroupSubscriptions(groupId);
  const { data: mySubscriptions = [], isLoading: loadingMy } = useMySubscriptions(groupId);
  const cancelSubscription = useCancelSubscription();

  const isLoading = loadingAll || loadingMy;

  const tierInfo = TIER_CONFIG[tier] ?? TIER_CONFIG.starter;
  const perks = TIER_PERKS[tier] ?? TIER_PERKS.starter;

  const nextThreshold = NEXT_THRESHOLD[tier];
  const prevThreshold = PREV_THRESHOLD[tier] ?? 0;
  const progressPercent = nextThreshold
    ? Math.min(100, ((boostCount - prevThreshold) / (nextThreshold - prevThreshold)) * 100)
    : 100;

  const mySubIds = new Set(mySubscriptions.map((s) => s.id));

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    cancelSubscription.mutate(
      { subscriptionId: cancelTarget.id, groupId },
      {
        onSuccess: (data) => {
          toast.success(data.message ?? "구독 취소가 예약되었습니다.");
          setCancelTarget(null);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "취소 중 오류가 발생했습니다.");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">그룹 부스트</h3>
            <Badge className={tierInfo.color}>{tierInfo.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            활성 부스트 {boostCount}개
          </p>
        </div>

        <Button onClick={() => setShowSubscribeDialog(true)} size="sm">
          <Zap className="mr-2 h-4 w-4" />
          부스트 추가
        </Button>
      </div>

      {/* 부스트 진행도 */}
      {nextThreshold !== null ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{tierInfo.label} → {NEXT_TIER_LABEL[tier]}</span>
            <span>{boostCount} / {nextThreshold} 부스트</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            다음 레벨까지 {Math.max(0, nextThreshold - boostCount)}개 더 필요
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            🏆 최고 티어 달성! Level 3
          </p>
        </div>
      )}

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

      {/* 부스터 목록 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">부스터 목록</h4>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
        ) : allSubscriptions.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            아직 부스트가 없습니다. 첫 번째 부스터가 되어보세요!
          </div>
        ) : (
          allSubscriptions.map((sub) => (
            <BoosterRow
              key={sub.id}
              subscription={sub}
              isMine={mySubIds.has(sub.id)}
              cancelPending={cancelSubscription.isPending && cancelTarget?.id === sub.id}
              onCancel={() => setCancelTarget(sub)}
            />
          ))
        )}
      </div>

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

      {/* 부스트 구독 Dialog */}
      <SubscriptionDialog
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
        groupId={groupId}
        groupName={groupName}
        currentBoostCount={boostCount}
      />

      {/* 취소 확인 Dialog */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부스트 구독을 취소하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 구독 기간(
              {cancelTarget?.current_period_end
                ? new Date(cancelTarget.current_period_end).toLocaleDateString("ko-KR")
                : ""}
              )까지는 부스트가 유지됩니다. 기간 종료 후 이 부스트가 그룹에서 제거됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>닫기</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              disabled={cancelSubscription.isPending}
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

interface BoosterRowProps {
  subscription: BoostSubscription;
  isMine: boolean;
  cancelPending: boolean;
  onCancel: () => void;
}

function BoosterRow({ subscription, isMine, cancelPending, onCancel }: BoosterRowProps) {
  const initials = subscription.user_display_name
    ? subscription.user_display_name.slice(0, 2).toUpperCase()
    : "??";

  const renewalDate = new Date(subscription.current_period_end).toLocaleDateString("ko-KR");

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {subscription.user_display_name || subscription.user_email}
          </span>
          {isMine && (
            <Badge variant="outline" className="text-xs py-0 h-4">나</Badge>
          )}
          {subscription.cancel_at_period_end && (
            <Badge variant="outline" className="text-xs py-0 h-4 text-orange-500 border-orange-300">
              취소 예정
            </Badge>
          )}
          {subscription.status === "past_due" && (
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>
            <Zap className="inline h-3 w-3 text-yellow-500 mr-0.5" />
            {subscription.quantity}개 · ₩{subscription.amount.toLocaleString()}/월
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {subscription.cancel_at_period_end
              ? `${renewalDate}에 종료`
              : `다음 결제: ${renewalDate}`}
          </span>
        </div>
      </div>

      {isMine && !subscription.cancel_at_period_end && subscription.status === "active" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-destructive h-7 shrink-0"
          onClick={onCancel}
          disabled={cancelPending}
        >
          취소
        </Button>
      )}
    </div>
  );
}
