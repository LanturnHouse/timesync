"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useUpdateWebhook,
  useWebhookLogs,
} from "@/hooks/use-webhooks";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "event.created", label: "Event Created" },
  { value: "event.updated", label: "Event Updated" },
  { value: "event.deleted", label: "Event Deleted" },
];

interface WebhookManagerProps {
  groupId: string;
}

export function WebhookManager({ groupId }: WebhookManagerProps) {
  const { data } = useWebhooks(groupId);
  const webhooks = data?.results ?? [];
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const updateWebhook = useUpdateWebhook();

  const [createOpen, setCreateOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [logsId, setLogsId] = useState<string | null>(null);
  const { data: logs } = useWebhookLogs(logsId);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleCreate = () => {
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error("Select at least one event type");
      return;
    }
    createWebhook.mutate(
      { group: groupId, url: url.trim(), event_types: selectedTypes },
      {
        onSuccess: () => {
          toast.success("Webhook created");
          setCreateOpen(false);
          setUrl("");
          setSelectedTypes([]);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Webhooks</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add Webhook
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <code className="text-xs break-all">{wh.url}</code>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={wh.is_active}
                    onCheckedChange={(checked) =>
                      updateWebhook.mutate({
                        webhookId: wh.id,
                        is_active: checked,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      setLogsId(logsId === wh.id ? null : wh.id)
                    }
                  >
                    {logsId === wh.id ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() =>
                      deleteWebhook.mutate(wh.id, {
                        onSuccess: () => toast.success("Webhook deleted"),
                        onError: (err) => toast.error(err.message),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {wh.event_types.map((et) => (
                  <Badge key={et} variant="outline" className="text-xs">
                    {et}
                  </Badge>
                ))}
              </div>

              {logsId === wh.id && logs && (
                <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                  {logs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No delivery logs yet.
                    </p>
                  ) : (
                    logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Badge
                          variant={log.success ? "default" : "destructive"}
                          className="text-[10px] px-1.5"
                        >
                          {log.response_status ?? "ERR"}
                        </Badge>
                        <span className="text-muted-foreground">
                          {log.event_type}
                        </span>
                        <span className="text-muted-foreground ml-auto">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(o) => !o && setCreateOpen(false)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wh-url">Endpoint URL</Label>
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhook"
              />
            </div>
            <div className="grid gap-2">
              <Label>Event Types</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((et) => (
                  <Badge
                    key={et.value}
                    variant={
                      selectedTypes.includes(et.value) ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleType(et.value)}
                  >
                    {et.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createWebhook.isPending}>
              {createWebhook.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
