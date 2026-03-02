"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscriptionPlans, usePrepareBilling } from "@/hooks/use-subscriptions";
import { loadTossPayments } from "@/lib/toss-payments";
import { cn } from "@/lib/utils";
import { Check, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

const PLAN_PERKS: Record<string, string[]> = {
  lv1: ["최대 25명", "웹훅 2개", "투표 무제한", "그룹 캘린더 공유"],
  lv2: ["최대 50명", "웹훅 5개", "투표 무제한", "Availability View", "그룹 캘린더 공유"],
  lv3: ["무제한 인원", "웹훅 15개", "투표 무제한", "Availability View", "우선 지원"],
};

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

export function SubscriptionDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
}: SubscriptionDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("lv1");
  const [isLoading, setIsLoading] = useState(false);

  const { data: plans = [] } = useSubscriptionPlans();
  const prepareBilling = usePrepareBilling();

  const handleSubscribe = async () => {
    if (!selectedPlan) return;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      toast.error("결제 설정이 올바르지 않습니다.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. 준비
      const { customer_key } = await prepareBilling.mutateAsync({
        plan: selectedPlan,
        group_id: groupId,
      });

      // 2. Toss 빌링키 발급 (카드 등록)
      const toss = await loadTossPayments(clientKey);
      await toss.requestBillingAuth("카드", {
        customerKey: customer_key,
        successUrl: `${window.location.origin}/payment/billing/success?plan=${selectedPlan}&groupId=${groupId}`,
        failUrl: `${window.location.origin}/payment/billing/fail`,
      });
      // Toss가 successUrl 또는 failUrl로 리다이렉트
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.";
      // 사용자가 결제 창을 닫은 경우 조용히 처리
      if (message.includes("사용자") || message.includes("cancel")) return;
      toast.error(message);
    }
  };

  const selectedPlanData = plans.find((p) => p.plan === selectedPlan);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {groupName} 구독하기
          </DialogTitle>
          <DialogDescription>
            월정액 구독으로 그룹 티어를 업그레이드하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {plans.map((plan) => {
            const isSelected = selectedPlan === plan.plan;
            const perks = PLAN_PERKS[plan.plan] ?? [];
            return (
              <button
                key={plan.plan}
                onClick={() => setSelectedPlan(plan.plan)}
                className={cn(
                  "w-full rounded-lg border-2 p-4 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{plan.label}</span>
                      {plan.plan === "lv3" && (
                        <Badge variant="secondary" className="text-xs">최고 티어</Badge>
                      )}
                      {plan.plan === "lv2" && (
                        <Badge variant="outline" className="text-xs text-purple-600">인기</Badge>
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-green-500 shrink-0" />
                          {perk}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">
                      ₩{plan.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">/ 월</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleSubscribe}
            disabled={isLoading || prepareBilling.isPending}
            className="flex-1"
          >
            {isLoading || prepareBilling.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {selectedPlanData
              ? `₩${selectedPlanData.amount.toLocaleString()}/월 구독하기`
              : "구독하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
