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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransferBoost } from "@/hooks/use-subscriptions";
import { useGroups } from "@/hooks/use-groups";
import { AlertTriangle, ArrowRight, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import type { BoostSubscription } from "@/types";

interface BoostTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BoostSubscription;
}

export function BoostTransferDialog({
  open,
  onOpenChange,
  subscription,
}: BoostTransferDialogProps) {
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const { data: groupsData } = useGroups();
  const transferBoost = useTransferBoost();

  // 현재 구독 그룹을 제외한 내 그룹 목록
  const availableGroups = (groupsData?.results ?? []).filter(
    (g) => g.id !== subscription.group
  );

  const selectedGroup = availableGroups.find((g) => g.id === targetGroupId);

  const handleTransfer = () => {
    if (!targetGroupId) return;

    transferBoost.mutate(
      { subscriptionId: subscription.id, targetGroupId },
      {
        onSuccess: () => {
          toast.success(
            `3일 후 '${selectedGroup?.name}'으로 이동이 예약되었습니다.`
          );
          onOpenChange(false);
          setTargetGroupId("");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "이동 예약 중 오류가 발생했습니다."
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            부스트 이동
          </DialogTitle>
          <DialogDescription>
            다른 그룹으로 부스트를 이동합니다. 3일 후에 적용됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* 이동 경로 표시 */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3 text-sm">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">현재 그룹</p>
              <p className="font-medium truncate">{subscription.group_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Zap className="inline h-3 w-3 text-yellow-500 mr-0.5" />
                {subscription.quantity}개 · ₩{subscription.amount.toLocaleString()}/월
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">이동 후 그룹</p>
              <p className="font-medium truncate text-primary">
                {selectedGroup?.name ?? "—"}
              </p>
            </div>
          </div>

          {/* 대상 그룹 선택 */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">이동할 그룹 선택</p>
            {availableGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3 text-center">
                이동 가능한 다른 그룹이 없습니다.
              </p>
            ) : (
              <Select value={targetGroupId} onValueChange={setTargetGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="그룹을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span className="flex items-center gap-2">
                        {g.name}
                        {g.tier !== "starter" && (
                          <span className="text-xs text-muted-foreground uppercase">
                            {g.tier}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 3일 지연 안내 */}
          <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            <div className="text-orange-700 dark:text-orange-300">
              <p className="font-medium">3일 후 적용</p>
              <p className="text-xs mt-0.5">
                이동 예약 후 3일 동안은 현재 그룹에 부스트가 유지됩니다.
                3일 후 자동으로 선택한 그룹으로 이동됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              setTargetGroupId("");
            }}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={handleTransfer}
            disabled={!targetGroupId || transferBoost.isPending || availableGroups.length === 0}
          >
            {transferBoost.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="mr-2 h-4 w-4" />
            )}
            이동 예약
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
