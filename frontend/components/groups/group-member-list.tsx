"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { UserMinus } from "lucide-react";
import { useUpdateMember, useRemoveMember } from "@/hooks/use-groups";
import { useAuth } from "@/providers/auth-provider";
import { toast } from "sonner";
import type { GroupMember } from "@/types";

interface GroupMemberListProps {
  groupId: string;
  members: GroupMember[];
  ownerId: string;
  isAdmin: boolean;
}

const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  editor: "secondary",
  member: "outline",
};

export function GroupMemberList({
  groupId,
  members,
  ownerId,
  isAdmin,
}: GroupMemberListProps) {
  const { user } = useAuth();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const handleRoleChange = (userId: string, role: string) => {
    updateMember.mutate(
      { groupId, userId, data: { role } },
      {
        onSuccess: () => toast.success("Role updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRemove = (userId: string) => {
    removeMember.mutate(
      { groupId, userId },
      {
        onSuccess: () => toast.success("Member removed"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isOwner = member.user === ownerId;
        const isSelf = member.user === user?.id;
        const canManage = isAdmin && !isOwner && !isSelf;
        const initials = member.user_display_name
          ? member.user_display_name.charAt(0).toUpperCase()
          : member.user_email.charAt(0).toUpperCase();

        return (
          <div
            key={member.user}
            className="flex items-center justify-between rounded-md border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {member.user_display_name || member.user_email}
                  {isSelf && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                {member.user_display_name && (
                  <p className="text-xs text-muted-foreground">
                    {member.user_email}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage ? (
                <>
                  <Select
                    value={member.role}
                    onValueChange={(val) => handleRoleChange(member.user, val)}
                  >
                    <SelectTrigger className="h-8 w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove member?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {member.user_display_name || member.user_email} will be
                          removed from this group.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemove(member.user)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <Badge variant={ROLE_VARIANTS[member.role] ?? "outline"}>
                  {isOwner ? "Owner" : member.role}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
