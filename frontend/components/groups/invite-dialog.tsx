"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInviteMember } from "@/hooks/use-groups";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  inviteCode: string;
}

export function InviteDialog({
  open,
  onClose,
  groupId,
  inviteCode,
}: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const inviteMember = useInviteMember();

  const handleEmailInvite = () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    inviteMember.mutate(
      { groupId, email: email.trim() },
      {
        onSuccess: () => {
          toast.success("Invitation sent");
          setEmail("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Invite code copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Email Invitation</Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                type="email"
                onKeyDown={(e) => e.key === "Enter" && handleEmailInvite()}
              />
              <Button
                onClick={handleEmailInvite}
                disabled={inviteMember.isPending}
              >
                {inviteMember.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label>Invite Code</Label>
            <div className="flex gap-2">
              <Input value={inviteCode} readOnly className="font-mono" />
              <Button variant="outline" size="icon" onClick={handleCopyCode}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code with others so they can join the group.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
