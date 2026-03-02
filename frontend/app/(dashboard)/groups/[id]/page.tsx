"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { GroupMemberList } from "@/components/groups/group-member-list";
import { InviteDialog } from "@/components/groups/invite-dialog";
import { ShareModeToggle } from "@/components/groups/share-mode-toggle";
import { BoostHistory } from "@/components/groups/boost-history";
import { PollCard } from "@/components/groups/poll-card";
import { PollCreateDialog } from "@/components/groups/poll-create-dialog";
import { WebhookManager } from "@/components/groups/webhook-manager";
import { AvailabilityView } from "@/components/groups/availability-view";
import { usePolls } from "@/hooks/use-polls";
import { useGroupWebSocket } from "@/hooks/use-websocket";
import {
  useDeleteGroup,
  useGroup,
  useLeaveGroup,
  useRegenerateInviteCode,
} from "@/hooks/use-groups";
import { useAuth } from "@/providers/auth-provider";
import { ArrowLeft, BarChart3, Download, LogOut, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function downloadGroupIcal(groupId: string, groupName: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/groups/${groupId}/calendar.ics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to export group calendar");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${groupName}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: group, isLoading } = useGroup(id);
  const leaveGroup = useLeaveGroup();
  const deleteGroup = useDeleteGroup();
  const regenerateCode = useRegenerateInviteCode();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const { data: pollsData } = usePolls(id);
  useGroupWebSocket(id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  const currentMember = group.members.find((m) => m.user === user?.id);
  const isAdmin = currentMember?.role === "admin";
  const isOwner = group.owner === user?.id;

  const handleLeave = () => {
    leaveGroup.mutate(group.id, {
      onSuccess: () => {
        toast.success("Left the group");
        router.push("/groups");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleDelete = () => {
    deleteGroup.mutate(group.id, {
      onSuccess: () => {
        toast.success("Group deleted");
        router.push("/groups");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleRegenerateCode = () => {
    regenerateCode.mutate(group.id, {
      onSuccess: () => toast.success("Invite code regenerated"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/groups")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">{group.name}</h1>
        {group.tier !== "starter" && (
          <Badge variant="default" className="text-xs uppercase">
            {group.tier}
          </Badge>
        )}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadGroupIcal(group.id, group.name).catch((err) =>
                toast.error(err.message)
              )
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export .ics
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members" className="mt-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="boosts">Boosts</TabsTrigger>
          <TabsTrigger value="polls">Polls</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {group.member_count}{group.max_members != null ? ` / ${group.max_members}` : ""} member{group.member_count !== 1 && "s"}
              {group.max_members != null && group.member_count >= group.max_members && (
                <span className="ml-2 text-xs text-destructive font-medium">(limit reached)</span>
              )}
            </p>
            {isAdmin && (
              <Button
                onClick={() => setInviteOpen(true)}
                disabled={group.max_members != null && group.member_count >= group.max_members}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>
          <GroupMemberList
            groupId={group.id}
            members={group.members}
            ownerId={group.owner}
            isAdmin={isAdmin}
          />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <AvailabilityView groupId={group.id} />
        </TabsContent>

        <TabsContent value="boosts" className="mt-4">
          <BoostHistory
            groupId={group.id}
            boostCount={group.boost_count}
            tier={group.tier}
            memberCount={group.member_count}
            maxMembers={group.max_members ?? null}
            isAdmin={isAdmin}
            groupName={group.name}
          />
        </TabsContent>

        <TabsContent value="polls" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {pollsData?.results?.length ?? 0} poll
              {(pollsData?.results?.length ?? 0) !== 1 && "s"}
            </p>
            <Button onClick={() => setPollOpen(true)}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Create Poll
            </Button>
          </div>
          {pollsData?.results?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No polls yet.</p>
          ) : (
            pollsData?.results?.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          {currentMember && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Event Sharing</h3>
              <p className="text-xs text-muted-foreground">
                When enabled, all your personal events will be visible to group
                members. When disabled, only events you explicitly share will be
                visible.
              </p>
              <ShareModeToggle
                groupId={group.id}
                userId={user!.id}
                currentMode={currentMember.share_mode}
              />
            </div>
          )}

          <Separator />

          {isAdmin && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Invite Code</h3>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-3 py-1.5 font-mono text-sm">
                  {group.invite_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCode}
                  disabled={regenerateCode.isPending}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Regenerate
                </Button>
              </div>
            </div>
          )}

          <Separator />

          {isAdmin && <WebhookManager groupId={group.id} />}

          <Separator />

          {(isOwner || !isOwner) && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-destructive">
                Danger Zone
              </h3>

              {/* Non-owners: Leave Group */}
              {!isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <LogOut className="mr-2 h-4 w-4" />
                      Leave Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will no longer have access to this group&apos;s
                        shared events.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Owner: Delete Group */}
              {isOwner && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The group{" "}
                        <strong>{group.name}</strong> and all associated data
                        (members, shared events, polls, boosts) will be
                        permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        disabled={deleteGroup.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        groupId={group.id}
        inviteCode={group.invite_code}
      />

      <PollCreateDialog
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        groupId={group.id}
      />
    </div>
  );
}
