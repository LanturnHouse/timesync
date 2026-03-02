"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { toast } from "sonner";

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
  const { theme, setTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("UTC");

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
      </div>
    </div>
  );
}
