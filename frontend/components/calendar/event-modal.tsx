"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentSection } from "@/components/calendar/comment-section";
import { AlertTriangle, BookCopy, CalendarSearch, Check, ChevronLeft, ChevronRight, Clock, Download, Loader2, MessageSquare, Users, X } from "lucide-react";
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useEvent,
  useShareEvent,
  useSaveAsTemplate,
  useRSVP,
  useAvailability,
} from "@/hooks/use-events";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGroups } from "@/hooks/use-groups";
import { useConflicts } from "@/hooks/use-conflicts";
import { useReminders, useCreateReminder, useDeleteReminder } from "@/hooks/use-reminders";
import { RecurrenceDialog, type RecurrenceScope } from "@/components/calendar/recurrence-dialog";
import { buildRRule, parseRRule, rruleHumanLabel } from "@/lib/rrule-utils";
import { useAuth } from "@/providers/auth-provider";
import { getAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function downloadIcal(eventId: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/events/${eventId}/export.ics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error("Failed to export calendar file");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  eventId?: string | null;
  defaultStart?: string;
  defaultEnd?: string;
}

const CATEGORIES = [
  { value: "", label: "None" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "meeting", label: "Meeting" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

const COLORS = [
  { value: "", label: "Default" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
];

function toLocalDatetime(isoString: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toISOString(localDatetime: string): string {
  if (!localDatetime) return "";
  return new Date(localDatetime).toISOString();
}

// Hours shown in Find Time mini-grid
const FIND_HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function FindTimePopover({
  groupId,
  onSelect,
}: {
  groupId: string;
  onSelect: (start: string, end: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const { data: availability, isLoading } = useAvailability(
    groupId,
    weekStart.toISOString(),
    weekEnd.toISOString()
  );
  const members = availability ? Object.values(availability) : [];

  function isBusySlot(day: Date, hour: number): boolean {
    return members.some((m) => {
      const slotStart = new Date(day);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(day);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      return m.busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > slotStart);
    });
  }

  function handleCellClick(day: Date, hour: number) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + 1, 0, 0, 0);
    const offset = start.getTimezoneOffset();
    const toLocal = (d: Date) =>
      new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
    onSelect(toLocal(start), toLocal(end));
  }

  return (
    <div className="w-[520px] p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <span className="text-xs font-medium">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-auto max-h-64">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr>
                <th className="w-10 p-0.5 text-right text-muted-foreground font-normal" />
                {days.map((d) => (
                  <th key={d.toISOString()} className="p-0.5 text-center font-medium min-w-[52px]">
                    <div className="text-muted-foreground">{format(d, "EEE")}</div>
                    <div>{format(d, "d")}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIND_HOURS.map((hour) => (
                <tr key={hour} className="border-t">
                  <td className="p-0.5 pr-1.5 text-right text-muted-foreground whitespace-nowrap">
                    {`${hour.toString().padStart(2, "0")}:00`}
                  </td>
                  {days.map((day) => {
                    const busy = isBusySlot(day, hour);
                    return (
                      <td
                        key={day.toISOString() + hour}
                        className={`border-l p-0.5 cursor-pointer transition-colors ${
                          busy
                            ? "bg-red-50 dark:bg-red-950/30 cursor-not-allowed"
                            : "bg-green-50 dark:bg-green-950/30 hover:bg-green-200 dark:hover:bg-green-800/40"
                        }`}
                        onClick={() => !busy && handleCellClick(day, hour)}
                        title={busy ? "Someone is busy" : `Set ${format(day, "EEE MMM d")} ${hour}:00–${hour + 1}:00`}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Click a <span className="font-medium text-green-600">green</span> slot to set the event time. Red slots have conflicts.
      </p>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function EventFormFields({
  title,
  setTitle,
  startAt,
  setStartAt,
  endAt,
  setEndAt,
  description,
  setDescription,
  category,
  setCategory,
  color,
  setColor,
  groupId,
  setGroupId,
  groups,
  isEditing,
  isCreator,
  existingEvent,
  eventId,
  shareEvent,
  conflicts,
  rrule,
  setRrule,
}: {
  title: string;
  setTitle: (v: string) => void;
  startAt: string;
  setStartAt: (v: string) => void;
  endAt: string;
  setEndAt: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  groups: any[];
  isEditing: boolean;
  isCreator: boolean;
  existingEvent: any;
  eventId?: string | null;
  shareEvent: any;
  conflicts?: any[];
  rrule?: string;
  setRrule?: (v: string) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      {conflicts && conflicts.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Time conflict detected</p>
            <ul className="mt-0.5 list-disc pl-4 text-xs">
              {conflicts.slice(0, 3).map((c) => (
                <li key={c.id}>{c.title}</li>
              ))}
              {conflicts.length > 3 && (
                <li>and {conflicts.length - 3} more…</li>
              )}
            </ul>
          </div>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="start">Start</Label>
          <Input
            id="start"
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="end">End</Label>
          <Input
            id="end"
            type="datetime-local"
            value={endAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value || "none"} value={c.value || "none"}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Color</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger>
              <SelectValue placeholder="Select color" />
            </SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c.value || "default"} value={c.value || "default"}>
                  <div className="flex items-center gap-2">
                    {c.value && (
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c.value }}
                      />
                    )}
                    {c.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Group</Label>
            {groupId && groupId !== "none" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                    <CalendarSearch className="mr-1 h-3 w-3" />
                    Find Time
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="p-0 w-auto">
                  <FindTimePopover
                    groupId={groupId}
                    onSelect={(s, e) => {
                      setStartAt(s);
                      setEndAt(e);
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Personal (no group)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Personal (no group)</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isEditing && isCreator && groups.length > 0 && (
        <div className="grid gap-2">
          <Label>Share with Groups</Label>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const isShared = existingEvent?.shared_to_groups?.includes(g.id);
              return (
                <Badge
                  key={g.id}
                  variant={isShared ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    shareEvent.mutate(
                      {
                        eventId: eventId!,
                        groupId: g.id,
                        action: isShared ? "unshare" : "share",
                      },
                      {
                        onSuccess: () =>
                          toast.success(
                            isShared
                              ? `Unshared from ${g.name}`
                              : `Shared with ${g.name}`
                          ),
                        onError: (err: any) => toast.error(err.message),
                      }
                    )
                  }
                >
                  {g.name}
                </Badge>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Click a group to toggle sharing.
          </p>
        </div>
      )}

      {/* Repeat / Recurrence */}
      {setRrule && (
        <div className="grid gap-2">
          <Label>Repeat</Label>
          <Select
            value={
              !rrule
                ? "none"
                : rrule.includes("FREQ=DAILY")
                ? "DAILY"
                : rrule.includes("FREQ=WEEKLY")
                ? "WEEKLY"
                : rrule.includes("FREQ=MONTHLY")
                ? "MONTHLY"
                : rrule.includes("FREQ=YEARLY")
                ? "YEARLY"
                : "none"
            }
            onValueChange={(val) => {
              if (val === "none") {
                setRrule("");
              } else {
                setRrule(`FREQ=${val}`);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Does not repeat" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Does not repeat</SelectItem>
              <SelectItem value="DAILY">Daily</SelectItem>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="YEARLY">Yearly</SelectItem>
            </SelectContent>
          </Select>
          {rrule && (
            <p className="text-xs text-muted-foreground">
              {rruleHumanLabel(rrule)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EventModal({
  open,
  onClose,
  eventId,
  defaultStart,
  defaultEnd,
}: EventModalProps) {
  const isEditing = !!eventId;
  const { data: existingEvent } = useEvent(eventId ?? null);
  const { data: groupsData } = useGroups();
  const groups = groupsData?.results ?? [];

  const { user } = useAuth();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const shareEvent = useShareEvent();
  const saveAsTemplate = useSaveAsTemplate();
  const rsvp = useRSVP();
  const { data: reminders } = useReminders(eventId ?? null);
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();
  const isCreator = existingEvent?.creator === user?.id;

  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [rrule, setRrule] = useState("");

  // Recurrence dialog state
  const [recurrenceDialog, setRecurrenceDialog] = useState<{
    open: boolean;
    mode: "edit" | "delete";
  }>({ open: false, mode: "edit" });

  const isRecurring = !!(existingEvent?.rrule || existingEvent?.parent_id);

  // Conflict detection — query only when both dates are set and modal is open
  const conflictStartIso = startAt ? toISOString(startAt) : "";
  const conflictEndIso = endAt ? toISOString(endAt) : "";
  const { data: conflicts } = useConflicts({
    startAt: conflictStartIso,
    endAt: conflictEndIso,
    excludeId: eventId,
    enabled: open && !!startAt && !!endAt,
  });

  useEffect(() => {
    if (isEditing && existingEvent) {
      setTitle(existingEvent.title);
      setStartAt(toLocalDatetime(existingEvent.start_at));
      setEndAt(toLocalDatetime(existingEvent.end_at));
      setDescription(existingEvent.description ?? "");
      setCategory(existingEvent.category);
      setColor(existingEvent.color);
      setGroupId(existingEvent.group ?? "");
      setRrule(existingEvent.rrule ?? "");
    } else if (!isEditing) {
      setTitle("");
      setStartAt(defaultStart ? toLocalDatetime(defaultStart) : "");
      setEndAt(defaultEnd ? toLocalDatetime(defaultEnd) : "");
      setDescription("");
      setCategory("");
      setColor("");
      setGroupId("");
      setRrule("");
    }
  }, [isEditing, existingEvent, defaultStart, defaultEnd]);

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!startAt || !endAt) {
      toast.error("Start and end times are required");
      return;
    }

    const data = {
      title: title.trim(),
      start_at: toISOString(startAt),
      end_at: toISOString(endAt),
      description: description || null,
      category,
      color,
      group: groupId || null,
      rrule: rrule || "",
    };

    if (isEditing) {
      if (isRecurring) {
        // Prompt for recurrence scope
        setRecurrenceDialog({ open: true, mode: "edit" });
        return;
      }
      updateEvent.mutate(
        { id: eventId!, ...data },
        {
          onSuccess: () => {
            toast.success("Event updated");
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createEvent.mutate(data, {
        onSuccess: () => {
          toast.success("Event created");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleDelete = () => {
    if (isRecurring) {
      setRecurrenceDialog({ open: true, mode: "delete" });
      return;
    }
    deleteEvent.mutate(
      { id: eventId! },
      {
        onSuccess: () => {
          toast.success("Event deleted");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleRecurrenceConfirm = (scope: RecurrenceScope) => {
    setRecurrenceDialog({ open: false, mode: "edit" });
    const recurrenceIdStr = existingEvent?.recurrence_id ?? existingEvent?.start_at;

    if (recurrenceDialog.mode === "delete") {
      deleteEvent.mutate(
        { id: eventId!, recurrence_scope: scope, recurrence_id: recurrenceIdStr ?? undefined },
        {
          onSuccess: () => {
            toast.success("Event deleted");
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      const data = {
        title: title.trim(),
        start_at: toISOString(startAt),
        end_at: toISOString(endAt),
        description: description || null,
        category,
        color,
        group: groupId || null,
        rrule: rrule || "",
        recurrence_id: recurrenceIdStr,
        recurrence_scope: scope,
      };
      updateEvent.mutate(
        { id: eventId!, ...data },
        {
          onSuccess: () => {
            toast.success("Event updated");
            onClose();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending =
    createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <Tabs defaultValue="details" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="rsvp" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                RSVP
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <EventFormFields
                title={title}
                setTitle={setTitle}
                startAt={startAt}
                setStartAt={setStartAt}
                endAt={endAt}
                setEndAt={setEndAt}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                color={color}
                setColor={setColor}
                groupId={groupId}
                setGroupId={setGroupId}
                groups={groups}
                isEditing={isEditing}
                isCreator={isCreator}
                existingEvent={existingEvent}
                eventId={eventId}
                shareEvent={shareEvent}
                conflicts={conflicts}
                rrule={rrule}
                setRrule={setRrule}
              />
              {/* Reminders section */}
              <div className="mt-4 space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Reminders</p>
                  <Select
                    value=""
                    onValueChange={(val) => {
                      if (!val || !eventId) return;
                      createReminder.mutate(
                        { eventId, remindBeforeMinutes: Number(val) },
                        {
                          onSuccess: () => toast.success("Reminder added"),
                          onError: (err) => toast.error(err.message),
                        }
                      );
                    }}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs">
                      <SelectValue placeholder="Add reminder" />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { value: "5", label: "5 min before" },
                        { value: "15", label: "15 min before" },
                        { value: "30", label: "30 min before" },
                        { value: "60", label: "1 hour before" },
                        { value: "120", label: "2 hours before" },
                        { value: "1440", label: "1 day before" },
                      ].map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reminders && reminders.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {reminders.map((r) => (
                      <Badge
                        key={r.id}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <Clock className="h-3 w-3" />
                        {r.remind_before_minutes < 60
                          ? `${r.remind_before_minutes}min`
                          : r.remind_before_minutes === 60
                          ? "1hr"
                          : r.remind_before_minutes === 120
                          ? "2hr"
                          : "1day"}
                        <button
                          className="ml-0.5 rounded-full hover:text-destructive"
                          onClick={() =>
                            deleteReminder.mutate(
                              { reminderId: r.id, eventId: eventId! },
                              {
                                onSuccess: () => toast.success("Reminder removed"),
                                onError: (err) => toast.error(err.message),
                              }
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No reminders set.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rsvp" className="mt-4 space-y-5">
              {/* RSVP action buttons */}
              <div>
                <p className="text-sm font-medium mb-3">Your Response</p>
                <div className="flex gap-2">
                  {(
                    [
                      { status: "accepted", label: "Accept", icon: Check, color: "bg-green-500 hover:bg-green-600 text-white" },
                      { status: "tentative", label: "Maybe", icon: Clock, color: "bg-amber-500 hover:bg-amber-600 text-white" },
                      { status: "declined", label: "Decline", icon: X, color: "bg-red-500 hover:bg-red-600 text-white" },
                    ] as const
                  ).map(({ status, label, icon: Icon, color }) => {
                    const isCurrent = existingEvent?.my_rsvp_status === status;
                    return (
                      <Button
                        key={status}
                        variant={isCurrent ? "default" : "outline"}
                        size="sm"
                        className={isCurrent ? color : ""}
                        disabled={rsvp.isPending}
                        onClick={() =>
                          rsvp.mutate(
                            { eventId: eventId!, status: isCurrent ? null : status },
                            {
                              onSuccess: () =>
                                toast.success(isCurrent ? "RSVP removed" : `Marked as ${label}`),
                              onError: (err) => toast.error(err.message),
                            }
                          )
                        }
                      >
                        <Icon className="mr-1.5 h-3.5 w-3.5" />
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Attendance counts */}
              <div>
                <p className="text-sm font-medium mb-3">Attendance</p>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { key: "accepted", label: "Accepted", cls: "text-green-600 dark:text-green-400" },
                      { key: "tentative", label: "Maybe", cls: "text-amber-600 dark:text-amber-400" },
                      { key: "declined", label: "Declined", cls: "text-red-600 dark:text-red-400" },
                    ] as const
                  ).map(({ key, label, cls }) => (
                    <div key={key} className="rounded-lg border p-3 text-center">
                      <p className={`text-2xl font-bold ${cls}`}>
                        {existingEvent?.rsvp_counts?.[key] ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <CommentSection eventId={eventId!} />
            </TabsContent>
          </Tabs>
        ) : (
          <EventFormFields
            title={title}
            setTitle={setTitle}
            startAt={startAt}
            setStartAt={setStartAt}
            endAt={endAt}
            setEndAt={setEndAt}
            description={description}
            setDescription={setDescription}
            category={category}
            setCategory={setCategory}
            color={color}
            setColor={setColor}
            groupId={groupId}
            setGroupId={setGroupId}
            groups={groups}
            isEditing={isEditing}
            isCreator={isCreator}
            existingEvent={existingEvent}
            eventId={eventId}
            shareEvent={shareEvent}
            conflicts={conflicts}
          />
        )}

        <DialogFooter className="flex justify-between">
          {isEditing && (
            <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isPending}>
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {isCreator && !existingEvent?.is_template && (
              <Button
                variant="outline"
                size="sm"
                disabled={saveAsTemplate.isPending}
                onClick={() =>
                  saveAsTemplate.mutate(eventId!, {
                    onSuccess: () => toast.success("Saved as template"),
                    onError: (err) => toast.error(err.message),
                  })
                }
              >
                <BookCopy className="mr-1 h-3.5 w-3.5" />
                Template
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadIcal(
                  eventId!,
                  `${existingEvent?.title ?? "event"}.ics`
                ).catch((err) => toast.error(err.message))
              }
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              .ics
            </Button>
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RecurrenceDialog
      open={recurrenceDialog.open}
      mode={recurrenceDialog.mode}
      onConfirm={handleRecurrenceConfirm}
      onCancel={() => setRecurrenceDialog((s) => ({ ...s, open: false }))}
    />
    </>
  );
}
