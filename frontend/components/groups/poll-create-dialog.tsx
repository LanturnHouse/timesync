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
import { Switch } from "@/components/ui/switch";
import { useCreatePoll } from "@/hooks/use-polls";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface PollCreateDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

export function PollCreateDialog({
  open,
  onClose,
  groupId,
}: PollCreateDialogProps) {
  const createPoll = useCreatePoll();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState("");

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setIsMultiple(false);
    setClosesAt("");
  };

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = () => {
    if (!question.trim()) {
      toast.error("Question is required");
      return;
    }

    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }

    createPoll.mutate(
      {
        group: groupId,
        question: question.trim(),
        options: validOptions.map((text, idx) => ({ text: text.trim(), order: idx })),
        is_multiple_choice: isMultiple,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success("Poll created");
          resetForm();
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What do you want to ask?"
            />
          </div>

          <div className="grid gap-2">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={addOption}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="multiple">Allow multiple choices</Label>
            <Switch
              id="multiple"
              checked={isMultiple}
              onCheckedChange={setIsMultiple}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="closes">Close at (optional)</Label>
            <Input
              id="closes"
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPoll.isPending}>
            {createPoll.isPending ? "Creating..." : "Create Poll"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
