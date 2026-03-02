"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useTemplates,
  useCreateFromTemplate,
  useDeleteEvent,
} from "@/hooks/use-events";
import { Calendar, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createFromTemplate = useCreateFromTemplate();
  const deleteEvent = useDeleteEvent();

  const [useOpen, setUseOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null
  );
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const openUseDialog = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setStartAt("");
    setEndAt("");
    setUseOpen(true);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplateId || !startAt || !endAt) {
      toast.error("Start and end times are required");
      return;
    }
    createFromTemplate.mutate(
      {
        templateId: selectedTemplateId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Event created from template");
          setUseOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Event Templates</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Reuse event configurations to quickly create new events.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">
            No templates yet. Open an event and click &quot;Template&quot; to
            save one.
          </p>
        )}
        {templates?.map((t) => (
          <div key={t.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{t.title}</h3>
                {t.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleDelete(t.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {t.category && <Badge variant="outline">{t.category}</Badge>}
              {t.color && (
                <div
                  className="h-5 w-5 rounded-full border"
                  style={{ backgroundColor: t.color }}
                />
              )}
              {t.group_name && (
                <Badge variant="secondary">{t.group_name}</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {Math.round(
                  (new Date(t.end_at).getTime() -
                    new Date(t.start_at).getTime()) /
                    60000
                )}{" "}
                min duration
              </span>
            </div>

            <Button
              className="w-full"
              size="sm"
              onClick={() => openUseDialog(t.id)}
            >
              <Calendar className="mr-2 h-3.5 w-3.5" />
              Use Template
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={useOpen} onOpenChange={(o) => !o && setUseOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Event from Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tpl-start">Start</Label>
              <Input
                id="tpl-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tpl-end">End</Label>
              <Input
                id="tpl-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUseTemplate}
              disabled={createFromTemplate.isPending}
            >
              {createFromTemplate.isPending ? "Creating..." : "Create Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
