"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useUserSettings,
  useUpdateUserSettings,
  useProfile,
  useUpdateProfile,
} from "@/hooks/use-settings";
import {
  useAllMySubscriptions,
  useCancelTransfer,
} from "@/hooks/use-subscriptions";
import { BoostTransferDialog } from "@/components/groups/boost-transfer-dialog";
import { useTheme } from "next-themes";
import { AlertTriangle, ArrowRight, Clock, Moon, Sun, Monitor, Zap } from "lucide-react";
import { toast } from "sonner";
import type { BoostSubscription } from "@/types";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
];

export default function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: mySubscriptions = [], isLoading: subsLoading } = useAllMySubscriptions();
  const cancelTransfer = useCancelTransfer();
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [transferTarget, setTransferTarget] = useState<BoostSubscription | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? "");
      setTimezone(profile.timezone ?? "UTC");
    }
  }, [profile]);

  const handleToggle = (
    field: "detect_self_conflicts" | "detect_group_conflicts",
    value: boolean
  ) => {
    updateSettings.mutate(
      { [field]: value },
      { onError: (err) => toast.error(err.message) }
    );
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { display_name: displayName, avatar_url: avatarUrl || null, timezone },
      {
        onSuccess: () => toast.success("Profile saved"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const initials = (profile?.display_name || profile?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  if (profileLoading || settingsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your preferences.
      </p>

      <div className="mt-6 space-y-6">

        {/* ── Profile ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Profile
          </h2>

          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{profile?.email}</p>
              <p className="text-xs capitalize">{profile?.plan?.replace("_", " ")} plan</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input
                id="avatar-url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              size="sm"
            >
              {updateProfile.isPending ? "Saving…" : "Save Profile"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* ── Appearance ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Appearance
          </h2>
          <div>
            <Label className="text-sm font-medium">Theme</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Choose how TimeSync looks on your device.
            </p>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
                className="flex items-center gap-1.5"
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="flex items-center gap-1.5"
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("system")}
                className="flex items-center gap-1.5"
              >
                <Monitor className="h-3.5 w-3.5" />
                System
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* ── Conflict Detection ── */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Conflict Detection
          </h2>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="self-conflicts" className="text-sm font-medium">
                Detect my own conflicts
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Show a warning when a new event overlaps with your own events.
                Always enabled by default.
              </p>
            </div>
            <Switch
              id="self-conflicts"
              checked={settings?.detect_self_conflicts ?? true}
              onCheckedChange={(v) => handleToggle("detect_self_conflicts", v)}
              disabled={updateSettings.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label
                htmlFor="group-conflicts"
                className="text-sm font-medium"
              >
                Detect group member conflicts
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Also check for overlaps with events shared by group members.
                Requires group event visibility.
              </p>
            </div>
            <Switch
              id="group-conflicts"
              checked={settings?.detect_group_conflicts ?? false}
              onCheckedChange={(v) =>
                handleToggle("detect_group_conflicts", v)
              }
              disabled={updateSettings.isPending}
            />
          </div>
        </div>

        <Separator />

        {/* ── 내 부스트 ── */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              내 부스트
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              현재 구독 중인 부스트 현황입니다. 다른 그룹으로 이동할 수 있습니다.
            </p>
          </div>

          {subsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : mySubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4 text-center">
              활성 부스트 구독이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {mySubscriptions.map((sub) => (
                <MyBoostRow
                  key={sub.id}
                  subscription={sub}
                  onTransfer={() => setTransferTarget(sub)}
                  onCancelTransfer={(transferId) =>
                    cancelTransfer.mutate(transferId, {
                      onSuccess: () => toast.success("이동 예약이 취소되었습니다."),
                      onError: (err) =>
                        toast.error(err instanceof Error ? err.message : "오류가 발생했습니다."),
                    })
                  }
                  cancelTransferPending={cancelTransfer.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 부스트 이동 Dialog */}
      {transferTarget && (
        <BoostTransferDialog
          open={!!transferTarget}
          onOpenChange={(open) => !open && setTransferTarget(null)}
          subscription={transferTarget}
        />
      )}
    </div>
  );
}

// ── 내 부스트 행 컴포넌트 ─────────────────────────────────────────────────────
interface MyBoostRowProps {
  subscription: BoostSubscription;
  onTransfer: () => void;
  onCancelTransfer: (transferId: string) => void;
  cancelTransferPending: boolean;
}

function MyBoostRow({
  subscription,
  onTransfer,
  onCancelTransfer,
  cancelTransferPending,
}: MyBoostRowProps) {
  const renewalDate = new Date(subscription.current_period_end).toLocaleDateString("ko-KR");
  const transfer = subscription.pending_transfer;

  const transferDaysLeft = transfer
    ? Math.max(0, Math.ceil((new Date(transfer.apply_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="rounded-lg border p-3 space-y-2">
      {/* 상단: 그룹명 + 뱃지 + 부스트 수 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="font-medium text-sm truncate">{subscription.group_name}</span>
          {subscription.status === "past_due" && (
            <Badge variant="destructive" className="text-xs h-4 shrink-0">결제 실패</Badge>
          )}
        </div>
        <span className="text-sm font-semibold shrink-0">
          {subscription.quantity}개
        </span>
      </div>

      {/* 하단: 금액 + 다음 결제일 + 이동 버튼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>₩{subscription.amount.toLocaleString()}/월</p>
          <p className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {subscription.cancel_at_period_end
              ? `${renewalDate}에 종료 예정`
              : `다음 결제: ${renewalDate}`}
          </p>
        </div>

        {/* 이동 예약 중이면 이동 예약 정보 + 취소 버튼 표시 */}
        {transfer ? (
          <div className="flex items-center gap-2 text-xs text-right">
            <div className="text-muted-foreground">
              <span className="flex items-center gap-1 text-orange-500 font-medium">
                <ArrowRight className="h-3 w-3" />
                {transfer.target_group_name}
              </span>
              <span className="text-xs">
                {new Date(transfer.apply_at).toLocaleDateString("ko-KR")} 적용
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => onCancelTransfer(transfer.id)}
              disabled={cancelTransferPending}
            >
              취소
            </Button>
          </div>
        ) : !subscription.cancel_at_period_end && subscription.status === "active" ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0"
            onClick={onTransfer}
          >
            <ArrowRight className="mr-1 h-3 w-3" />
            이동
          </Button>
        ) : null}
      </div>

      {/* 이동 예약 중 안내 배너 */}
      {transfer && (
        <div className="flex items-center gap-1.5 rounded bg-orange-50 dark:bg-orange-950/20 px-2 py-1.5 text-xs text-orange-600 dark:text-orange-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>
            {transferDaysLeft > 0 ? `${transferDaysLeft}일 후` : "오늘"}{" "}
            <strong>{transfer.target_group_name}</strong>으로 이동 예약됨
          </span>
        </div>
      )}
    </div>
  );
}
