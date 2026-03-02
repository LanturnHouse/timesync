"use client";

import { useState } from "react";
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
import { Loader2, Minus, Plus, Zap } from "lucide-react";
import { toast } from "sonner";

const TIER_THRESHOLDS = [
  { boosts: 3,  label: "Lv1", color: "text-blue-600" },
  { boosts: 7,  label: "Lv2", color: "text-purple-600" },
  { boosts: 15, label: "Lv3", color: "text-amber-600" },
];

interface SubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  currentBoostCount: number;
}

export function SubscriptionDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  currentBoostCount,
}: SubscriptionDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const { data: plans } = useSubscriptionPlans();
  const prepareBilling = usePrepareBilling();

  const perBoostPrice = plans?.per_boost_price ?? 1900;
  const maxQty = plans?.max_quantity ?? 10;
  const totalAmount = perBoostPrice * quantity;
  const projectedTotal = currentBoostCount + quantity;

  // 구독 후 달성 가능한 티어
  const projectedTier = TIER_THRESHOLDS.slice()
    .reverse()
    .find((t) => projectedTotal >= t.boosts);

  const handleSubscribe = async () => {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey) {
      toast.error("결제 설정이 올바르지 않습니다.");
      return;
    }

    setIsLoading(true);
    try {
      const { customer_key } = await prepareBilling.mutateAsync({ quantity, group_id: groupId });
      const toss = await loadTossPayments(clientKey);
      await toss.requestBillingAuth("카드", {
        customerKey: customer_key,
        successUrl: `${window.location.origin}/payment/billing/success?quantity=${quantity}&groupId=${groupId}`,
        failUrl: `${window.location.origin}/payment/billing/fail`,
      });
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : "결제 중 오류가 발생했습니다.";
      if (message.toLowerCase().includes("cancel")) return;
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            {groupName} 부스트하기
          </DialogTitle>
          <DialogDescription>
            월 ₩{perBoostPrice.toLocaleString()}원 / 부스트 — 언제든지 취소 가능
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* 수량 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">부스트 수량</p>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <div className="text-center">
                <span className="text-2xl font-bold">{quantity}</span>
                <p className="text-xs text-muted-foreground">개</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* 현재 → 구독 후 부스트 수 */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">현재 그룹 부스트</span>
              <span className="font-medium">{currentBoostCount}개</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">구독 후</span>
              <span className="font-medium text-primary">
                {projectedTotal}개
                {projectedTier && (
                  <span className={`ml-1.5 text-xs font-semibold ${projectedTier.color}`}>
                    → {projectedTier.label} 달성!
                  </span>
                )}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>월 결제액</span>
              <span>₩{totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* 티어 기준 안내 */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            {TIER_THRESHOLDS.map((t) => (
              <span key={t.label} className={projectedTotal >= t.boosts ? t.color : ""}>
                {t.label}: {t.boosts}개+
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubscribe}
            disabled={isLoading || prepareBilling.isPending}
          >
            {isLoading || prepareBilling.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            ₩{totalAmount.toLocaleString()}/월
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
