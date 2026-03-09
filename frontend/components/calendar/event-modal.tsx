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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CommentSection } from "@/components/calendar/comment-section";
import type { RsvpUser } from "@/types";
import {
  AlertTriangle,
  BookCopy,
  Calendar,
  CalendarSearch,

  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Pencil,
  Users,
  X,
} from "lucide-react";
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
import { rruleHumanLabel } from "@/lib/rrule-utils";
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
  if (!res.ok) throw new Error("Failed to export calendar file");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type ModalMode = "view" | "edit" | "create";

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

const CATEGORY_LABELS: Record<string, string> = {
  work: "Work",
  personal: "Personal",
  meeting: "Meeting",
  social: "Social",
  other: "Other",
};

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

// ── View Mode: detail view ──────────────────────────────────────────────────

function EventDetailView({
  event,
  eventId,
  isCreator,
  onEdit,
  onClose,
  onDelete,
  onSaveTemplate,
  rsvp,
  saveAsTemplate,
  deleteEvent,
}: {
  event: any;
  eventId: string;
  isCreator: boolean;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onSaveTemplate: () => void;
  rsvp: any;
  saveAsTemplate: any;
  deleteEvent: any;
}) {
  const startDate = event.start_at ? new Date(event.start_at) : null;
  const endDate   = event.end_at   ? new Date(event.end_at)   : null;

  const isSameDay =
    startDate && endDate &&
    format(startDate, "yyyy-MM-dd") === format(endDate, "yyyy-MM-dd");

  const dateStr = startDate
    ? isSameDay
      ? format(startDate, "yyyy년 M월 d일 (EEE)")
      : `${format(startDate, "yyyy년 M월 d일")} – ${format(endDate!, "M월 d일")}`
    : "";

  const timeStr = startDate
    ? `${format(startDate, "HH:mm")} – ${format(endDate!, "HH:mm")}`
    : "";

  const durationMinutes = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    : 0;
  const durationStr = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}시간${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60}분` : ""}`
    : `${durationMinutes}분`;

  const accepted  = event.rsvp_counts?.accepted  ?? 0;
  const tentative = event.rsvp_counts?.tentative ?? 0;
  const declined  = event.rsvp_counts?.declined  ?? 0;

  return (
    <DialogContent className="sm:max-w-[880px] h-[84vh] flex flex-col p-0 gap-0 overflow-hidden [&>button:last-child]:hidden">

      {/* ── 이벤트 컬러 상단 스트립 ── */}
      {event.color && (
        <div className="h-1.5 w-full shrink-0 rounded-t-lg" style={{ backgroundColor: event.color }} />
      )}

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b shrink-0">
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-xl font-semibold leading-snug pr-2">
            {event.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {event.category && (
              <Badge variant="secondary" className="text-xs font-normal">
                {CATEGORY_LABELS[event.category] ?? event.category}
              </Badge>
            )}
            {event.group_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.group_name}
              </span>
            )}
            {event.rrule && (
              <span className="text-xs text-muted-foreground">
                {rruleHumanLabel(event.rrule)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isCreator && (
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              편집
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── BODY: 상단(이벤트 정보) / 하단(댓글) ── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {/* ══ 상단: 이벤트 정보 (전체 너비) ══ */}
        <div className="flex-[0_0_45%] border-b overflow-hidden">

          {/* 이벤트 정보 (스크롤 가능) */}
          <div className="h-full overflow-y-auto p-6 flex flex-col gap-5">

            {/* 날짜 & 시간 */}
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="pt-0.5">
                <p className="text-base font-semibold">{dateStr}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {timeStr}
                  {durationMinutes > 0 && (
                    <span className="ml-2 text-muted-foreground/60 text-xs">({durationStr})</span>
                  )}
                </p>
              </div>
            </div>

            {/* 설명 */}
            {event.description && (
              <div className="rounded-xl bg-muted/50 px-4 py-3.5">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {event.description}
                </p>
              </div>
            )}

            {/* 구분선 */}
            <div className="h-px bg-border" />

            {/* 참석 현황 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">참석 현황</p>
              <div className="flex items-center gap-4">
                {(
                  [
                    { count: accepted,  users: event.rsvp_details?.accepted  ?? [], label: "수락", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800" },
                    { count: tentative, users: event.rsvp_details?.tentative ?? [], label: "미정", dot: "bg-amber-500",   badge: "bg-amber-50   text-amber-700   border-amber-200   hover:bg-amber-100   dark:bg-amber-950/20   dark:text-amber-400   dark:border-amber-800"   },
                    { count: declined,  users: event.rsvp_details?.declined  ?? [], label: "불가", dot: "bg-red-500",     badge: "bg-red-50     text-red-700     border-red-200     hover:bg-red-100     dark:bg-red-950/20     dark:text-red-400     dark:border-red-800"     },
                  ] as { count: number; users: RsvpUser[]; label: string; dot: string; badge: string }[]
                ).map(({ count, users, label, dot, badge }) => (
                  <Popover key={label}>
                    <PopoverTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${badge}`}
                        disabled={count === 0}
                      >
                        <span className={`h-2 w-2 rounded-full ${dot}`} />
                        <span className="font-bold tabular-nums">{count}</span>
                        <span>{label}</span>
                      </button>
                    </PopoverTrigger>
                    {count > 0 && (
                      <PopoverContent className="w-56 p-2" align="start">
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">{label} ({count}명)</p>
                        <div className="space-y-1">
                          {users.map((u) => (
                            <div key={u.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted">
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarImage src={u.avatar_url ?? undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {(u.display_name || u.email).charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate">
                                {u.display_name || u.email}
                              </span>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                ))}
              </div>
            </div>

            {/* 내 응답 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">내 응답</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { status: "accepted",  label: "✓ 참여", sel: "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500" },
                    { status: "tentative", label: "? 미정", sel: "bg-amber-500   hover:bg-amber-600   text-white border-amber-500"   },
                    { status: "declined",  label: "✗ 불가", sel: "bg-red-500     hover:bg-red-600     text-white border-red-500"     },
                  ] as const
                ).map(({ status, label, sel }) => {
                  const isCurrent = event.my_rsvp_status === status;
                  return (
                    <Button
                      key={status}
                      variant={isCurrent ? "default" : "outline"}
                      size="sm"
                      className={`text-xs font-medium ${isCurrent ? sel : "text-muted-foreground hover:text-foreground"}`}
                      disabled={rsvp.isPending}
                      onClick={() =>
                        rsvp.mutate(
                          { eventId, status: isCurrent ? null : status },
                          {
                            onSuccess: () => toast.success(isCurrent ? "응답이 취소되었습니다" : `${label.slice(2)}로 응답했습니다`),
                            onError: (err: any) => toast.error(err.message),
                          }
                        )
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* 관리 (creator only) */}
            {isCreator && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">관리</p>
                <div className="flex flex-wrap gap-2">
                  {!event.is_template && (
                    <Button
                      variant="outline" size="sm" className="h-8 text-xs"
                      disabled={saveAsTemplate.isPending}
                      onClick={onSaveTemplate}
                    >
                      <BookCopy className="mr-1.5 h-3.5 w-3.5" />템플릿 저장
                    </Button>
                  )}
                  <Button
                    variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() =>
                      downloadIcal(eventId, `${event.title ?? "event"}.ics`).catch(
                        (err) => toast.error(err.message)
                      )
                    }
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />.ics 내보내기
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={deleteEvent.isPending}>
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>이벤트를 삭제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete}>삭제</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ══ 하단: 댓글 / 로그 (전체 너비) ══ */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="px-6 pt-3 pb-2 border-b shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">댓글 / 로그</p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col px-6 pb-4 overflow-hidden">
            <CommentSection eventId={eventId} />
          </div>
        </div>
      </div>
    </DialogContent>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export function EventModal({
  open,
  onClose,
  eventId,
  defaultStart,
  defaultEnd,
}: EventModalProps) {
  const hasExistingEvent = !!eventId;
  const [mode, setMode] = useState<ModalMode>(hasExistingEvent ? "view" : "create");

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

  const [recurrenceDialog, setRecurrenceDialog] = useState<{
    open: boolean;
    mode: "edit" | "delete";
  }>({ open: false, mode: "edit" });

  const isRecurring = !!(existingEvent?.rrule || existingEvent?.parent_id);

  // Reset mode when eventId changes
  useEffect(() => {
    setMode(eventId ? "view" : "create");
  }, [eventId]);

  // Conflict detection
  const conflictStartIso = startAt ? toISOString(startAt) : "";
  const conflictEndIso = endAt ? toISOString(endAt) : "";
  const { data: conflicts } = useConflicts({
    startAt: conflictStartIso,
    endAt: conflictEndIso,
    excludeId: eventId,
    enabled: open && mode !== "view" && !!startAt && !!endAt,
  });

  useEffect(() => {
    if (existingEvent && mode === "edit") {
      setTitle(existingEvent.title);
      setStartAt(toLocalDatetime(existingEvent.start_at));
      setEndAt(toLocalDatetime(existingEvent.end_at));
      setDescription(existingEvent.description ?? "");
      setCategory(existingEvent.category);
      setColor(existingEvent.color);
      setGroupId(existingEvent.group ?? "");
      setRrule(existingEvent.rrule ?? "");
    } else if (mode === "create") {
      setTitle("");
      setStartAt(defaultStart ? toLocalDatetime(defaultStart) : "");
      setEndAt(defaultEnd ? toLocalDatetime(defaultEnd) : "");
      setDescription("");
      setCategory("");
      setColor("");
      setGroupId("");
      setRrule("");
    }
  }, [existingEvent, mode, defaultStart, defaultEnd]);

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

    if (mode === "edit") {
      if (isRecurring) {
        setRecurrenceDialog({ open: true, mode: "edit" });
        return;
      }
      updateEvent.mutate(
        { id: eventId!, ...data },
        {
          onSuccess: () => {
            toast.success("이벤트가 수정되었습니다");
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createEvent.mutate(data, {
        onSuccess: () => {
          toast.success("이벤트가 생성되었습니다");
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
          toast.success("이벤트가 삭제되었습니다");
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
            toast.success("이벤트가 삭제되었습니다");
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
            toast.success("이벤트가 수정되었습니다");
            setMode("view");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending =
    createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  // ── VIEW mode ────────────────────────────────────────────────────────────
  if (open && mode === "view" && existingEvent) {
    return (
      <>
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
          <EventDetailView
            event={existingEvent}
            eventId={eventId!}
            isCreator={isCreator}
            onEdit={() => setMode("edit")}
            onClose={onClose}
            onDelete={handleDelete}
            onSaveTemplate={() =>
              saveAsTemplate.mutate(eventId!, {
                onSuccess: () => toast.success("템플릿으로 저장되었습니다"),
                onError: (err) => toast.error(err.message),
              })
            }
            rsvp={rsvp}
            saveAsTemplate={saveAsTemplate}
            deleteEvent={deleteEvent}
          />
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

  // ── EDIT / CREATE mode ───────────────────────────────────────────────────
  const isEditMode = mode === "edit";

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 -ml-1"
                  onClick={() => setMode("view")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle>{isEditMode ? "이벤트 편집" : "이벤트 만들기"}</DialogTitle>
            </div>
          </DialogHeader>

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
            isEditing={isEditMode}
            isCreator={isCreator}
            existingEvent={existingEvent}
            eventId={eventId}
            shareEvent={shareEvent}
            conflicts={conflicts}
            rrule={rrule}
            setRrule={setRrule}
          />

          {/* Reminders (edit mode only) */}
          {isEditMode && (
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">알림</p>
                <Select
                  value=""
                  onValueChange={(val) => {
                    if (!val || !eventId) return;
                    createReminder.mutate(
                      { eventId, remindBeforeMinutes: Number(val) },
                      {
                        onSuccess: () => toast.success("알림이 추가되었습니다"),
                        onError: (err) => toast.error(err.message),
                      }
                    );
                  }}
                >
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="알림 추가" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "5", label: "5분 전" },
                      { value: "15", label: "15분 전" },
                      { value: "30", label: "30분 전" },
                      { value: "60", label: "1시간 전" },
                      { value: "120", label: "2시간 전" },
                      { value: "1440", label: "1일 전" },
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
                        ? `${r.remind_before_minutes}분`
                        : r.remind_before_minutes === 60
                        ? "1시간"
                        : r.remind_before_minutes === 120
                        ? "2시간"
                        : "1일"}
                      <button
                        className="ml-0.5 rounded-full hover:text-destructive"
                        onClick={() =>
                          deleteReminder.mutate(
                            { reminderId: r.id, eventId: eventId! },
                            {
                              onSuccess: () => toast.success("알림이 삭제되었습니다"),
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
                <p className="text-xs text-muted-foreground">설정된 알림이 없습니다.</p>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => (isEditMode ? setMode("view") : onClose())}
                disabled={isPending}
              >
                취소
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "저장 중…" : isEditMode ? "수정" : "만들기"}
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
