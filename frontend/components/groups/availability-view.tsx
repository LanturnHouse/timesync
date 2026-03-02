"use client";

import { useMemo, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvailability } from "@/hooks/use-events";
import type { MemberAvailability } from "@/types";

interface AvailabilityViewProps {
  groupId: string;
}

// Display hours 8 AM – 9 PM (inclusive)
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isBusy(
  member: MemberAvailability,
  day: Date,
  hour: number
): boolean {
  const slotStart = new Date(day);
  slotStart.setHours(hour, 0, 0, 0);
  const slotEnd = new Date(day);
  slotEnd.setHours(hour + 1, 0, 0, 0);
  return member.busy.some((b) => {
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);
    return bStart < slotEnd && bEnd > slotStart;
  });
}

export function AvailabilityView({ groupId }: AvailabilityViewProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = addDays(weekStart, 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startStr = weekStart.toISOString();
  const endStr = weekEnd.toISOString();

  const { data: availability, isLoading } = useAvailability(
    groupId,
    startStr,
    endStr
  );

  const members = useMemo(
    () => (availability ? Object.values(availability) : []),
    [availability]
  );

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(weekStart, "MMM d")} –{" "}
          {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !availability || members.length === 0 ? (
        <p className="text-center py-8 text-sm text-muted-foreground">
          No members found.
        </p>
      ) : (
        <>
          <div className="overflow-auto rounded-md border">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 w-14 bg-muted/50 p-1 text-right font-normal text-muted-foreground" />
                  {days.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="min-w-[72px] p-1 text-center font-medium"
                    >
                      <div className="text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <div>{format(day, "d")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => (
                  <tr key={hour} className="border-t">
                    <td className="sticky left-0 z-10 bg-background p-1 pr-2 text-right text-muted-foreground whitespace-nowrap">
                      {`${hour.toString().padStart(2, "0")}:00`}
                    </td>
                    {days.map((day) => {
                      const busyMembers = members.filter((m) =>
                        isBusy(m, day, hour)
                      );
                      const allFree = busyMembers.length === 0;
                      const allBusy = busyMembers.length === members.length;
                      const cellCls = allFree
                        ? "bg-green-50 dark:bg-green-950/30"
                        : allBusy
                        ? "bg-red-50 dark:bg-red-950/30"
                        : "bg-amber-50 dark:bg-amber-950/20";

                      return (
                        <td
                          key={day.toISOString() + hour}
                          className={`border-l p-0.5 align-top ${cellCls}`}
                          style={{ minHeight: 28 }}
                        >
                          {busyMembers.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 p-0.5">
                              {busyMembers.map((m) => (
                                <span
                                  key={m.user_email}
                                  title={`${m.user_display_name} — busy`}
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-400 text-[9px] font-bold text-white"
                                >
                                  {initials(m.user_display_name)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-green-50 dark:bg-green-950/50 border border-green-200" />
              All free
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200" />
              Some busy
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-red-50 dark:bg-red-950/30 border border-red-200" />
              All busy
            </div>
          </div>

          {/* Members legend */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Members ({members.length})
            </p>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <div
                  key={m.user_email}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-400 text-[9px] font-bold text-white">
                    {initials(m.user_display_name)}
                  </span>
                  <span>{m.user_display_name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
