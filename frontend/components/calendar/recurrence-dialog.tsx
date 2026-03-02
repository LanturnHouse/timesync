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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type RecurrenceScope = "this" | "future" | "all";

interface RecurrenceDialogProps {
  open: boolean;
  mode: "edit" | "delete";
  onConfirm: (scope: RecurrenceScope) => void;
  onCancel: () => void;
}

export function RecurrenceDialog({
  open,
  mode,
  onConfirm,
  onCancel,
}: RecurrenceDialogProps) {
  const [scope, setScope] = useState<RecurrenceScope>("this");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit recurring event" : "Delete recurring event"}
          </DialogTitle>
        </DialogHeader>

        <RadioGroup
          value={scope}
          onValueChange={(v) => setScope(v as RecurrenceScope)}
          className="space-y-3 py-2"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="this" id="scope-this" />
            <Label htmlFor="scope-this" className="cursor-pointer">
              This event only
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="future" id="scope-future" />
            <Label htmlFor="scope-future" className="cursor-pointer">
              This and following events
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="all" id="scope-all" />
            <Label htmlFor="scope-all" className="cursor-pointer">
              All events in the series
            </Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={mode === "delete" ? "destructive" : "default"}
            onClick={() => onConfirm(scope)}
          >
            {mode === "delete" ? "Delete" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
