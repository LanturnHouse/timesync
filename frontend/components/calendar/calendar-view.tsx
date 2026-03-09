"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { useCalendarEvents, useUpdateEvent } from "@/hooks/use-events";
import { toFullCalendarEvents } from "@/lib/calendar-utils";
import { toast } from "sonner";

interface CalendarViewProps {
  onDateSelect?: (start: string, end: string) => void;
  onEventClick?: (eventId: string) => void;
  categoryFilter?: string;
  search?: string;
}

export function CalendarView({
  onDateSelect,
  onEventClick,
  categoryFilter,
  search,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  }>({ start: "", end: "" });

  const { data: events, isLoading } = useCalendarEvents(
    dateRange.start,
    dateRange.end,
    categoryFilter,
    search,
  );
  const updateEvent = useUpdateEvent();

  const handleDatesSet = useCallback(
    (arg: { startStr: string; endStr: string }) => {
      setDateRange({ start: arg.startStr, end: arg.endStr });
    },
    []
  );

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      onDateSelect?.(selectInfo.startStr, selectInfo.endStr);
    },
    [onDateSelect]
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      onEventClick?.(clickInfo.event.id);
    },
    [onEventClick]
  );

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      updateEvent.mutate(
        {
          id: info.event.id,
          start_at: info.event.startStr,
          end_at: info.event.endStr,
        },
        {
          onError: () => {
            info.revert();
            toast.error("Failed to update event");
          },
          onSuccess: () => {
            toast.success("Event updated");
          },
        }
      );
    },
    [updateEvent]
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      updateEvent.mutate(
        {
          id: info.event.id,
          start_at: info.event.startStr,
          end_at: info.event.endStr,
        },
        {
          onError: () => {
            info.revert();
            toast.error("Failed to resize event");
          },
          onSuccess: () => {
            toast.success("Event updated");
          },
        }
      );
    },
    [updateEvent]
  );

  const calendarEvents = events ? toFullCalendarEvents(events) : [];

  return (
    <div className="h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        events={calendarEvents}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        datesSet={handleDatesSet}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        loading={(_loading) => {
          // FullCalendar internal loading state
        }}
        height="auto"
        nowIndicator={true}
        eventTimeFormat={{
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      )}
    </div>
  );
}
