"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupCard } from "@/components/groups/group-card";
import { GroupCreateDialog } from "@/components/groups/group-create-dialog";
import { useGroups, useJoinByCode } from "@/hooks/use-groups";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function GroupsPage() {
  const { data, isLoading } = useGroups();
  const groups = data?.results ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const joinByCode = useJoinByCode();

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    joinByCode.mutate(joinCode.trim(), {
      onSuccess: () => {
        toast.success("Joined group successfully");
        setJoinCode("");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Groups</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter invite code to join..."
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <Button
          variant="outline"
          onClick={handleJoin}
          disabled={joinByCode.isPending}
        >
          Join
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))
          : groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
        {!isLoading && groups.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground">
            No groups yet. Create one or join with an invite code.
          </p>
        )}
      </div>

      <GroupCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
