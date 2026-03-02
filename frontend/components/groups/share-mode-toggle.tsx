"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUpdateMember } from "@/hooks/use-groups";
import { toast } from "sonner";

interface ShareModeToggleProps {
  groupId: string;
  userId: string;
  currentMode: "all" | "selective";
}

export function ShareModeToggle({
  groupId,
  userId,
  currentMode,
}: ShareModeToggleProps) {
  const updateMember = useUpdateMember();

  const handleToggle = (checked: boolean) => {
    const newMode = checked ? "all" : "selective";
    updateMember.mutate(
      { groupId, userId, data: { share_mode: newMode } },
      {
        onSuccess: () =>
          toast.success(
            checked
              ? "Sharing all events with this group"
              : "Switched to selective sharing"
          ),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={currentMode === "all"}
        onCheckedChange={handleToggle}
        disabled={updateMember.isPending}
      />
      <Label className="text-sm">
        {currentMode === "all"
          ? "Share all my events"
          : "Selective sharing"}
      </Label>
    </div>
  );
}
