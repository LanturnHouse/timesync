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
import { useCreateGroup } from "@/hooks/use-groups";
import { toast } from "sonner";

interface GroupCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GroupCreateDialog({ open, onClose }: GroupCreateDialogProps) {
  const [name, setName] = useState("");
  const createGroup = useCreateGroup();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    createGroup.mutate(
      { name: name.trim() },
      {
        onSuccess: () => {
          toast.success("Group created");
          setName("");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createGroup.isPending}>
            {createGroup.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
