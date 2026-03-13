"use client";

import { useCallback, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { DateSelectArg, DatesSetArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { useCalendarEvents, useUpdateEvent } from "@/hooks/use-events";
import { toFullCalendarEvents } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { value: "dayGridMonth", label: "월" },
  { value: "timeGridWeek", label: "주" },
  { value: "timeGridDay",  label: "일" },
  { value: "listWeek",     label: "목록" },
];

interface CalendarViewProps {
  onDateSelect?: (start: string, end: string) => void;
  onEventClick?: (eventId: string) => void;
  categoryFilter?: string;
  search?: string;
  headerActions?: React.ReactNode;
}

export function CalendarView({
  onDateSelect,
  onEventClick,
  categoryFilter,
  search,
  headerActions,
}: CalendarViewProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [titleText, setTitleText] = useState("");
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const { data: events, isLoading } = useCalendarEvents(
    dateRange.start,
    dateRange.end,
    categoryFilter,
    search,
  );
  const updateEvent = useUpdateEvent();

  const api = () => calendarRef.current?.getApi();

  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    setDateRange({
      start: arg.view.activeStart.toISOString(),
      end: arg.view.activeEnd.toISOString(),
    });
    setTitleText(arg.view.title);
    setCurrentView(arg.view.type);
  }, []);

  const handleDateSelect = useCallback(
    (selectInfo: DateSelectArg) => {
      onDateSelect?.(selectInfo.startStr, selectInfo.endStr);
    },
    [onDateSelect],
  );

  const handleDateClick = useCallback(
    (clickInfo: DateClickArg) => {
      // Mobile tap (and desktop single-click) — open create modal with 1-hour default
      const start = clickInfo.date;
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      onDateSelect?.(start.toISOString(), end.toISOString());
    },
    [onDateSelect],
  );

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      onEventClick?.(clickInfo.event.id);
    },
    [onEventClick],
  );

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      updateEvent.mutate(
        { id: info.event.id, start_at: info.event.startStr, end_at: info.event.endStr },
        {
          onError: () => { info.revert(); toast.error("Failed to update event"); },
          onSuccess: () => toast.success("Event updated"),
        },
      );
    },
    [updateEvent],
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      updateEvent.mutate(
        { id: info.event.id, start_at: info.event.startStr, end_at: info.event.endStr },
        {
          onError: () => { info.revert(); toast.error("Failed to resize event"); },
          onSuccess: () => toast.success("Event updated"),
        },
      );
    },
    [updateEvent],
  );

  // Swipe to navigate (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Trigger only when horizontal movement is dominant and exceeds threshold
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      dx < 0 ? api()?.next() : api()?.prev();
    }
  };

  const calendarEvents = events ? toFullCalendarEvents(events) : [];

  return (
    <div className="h-full flex flex-col">
      {/* Custom header: [←][오늘][→] [title] [월/주/일/목록] [actions] */}
      <div className="flex items-center gap-1 pb-2 shrink-0 min-w-0">
        {/* Navigation */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => api()?.prev()}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            aria-label="이전"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => api()?.today()}
            className="rounded-md px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            오늘
          </button>
          <button
            onClick={() => api()?.next()}
            className="rounded-md p-1.5 hover:bg-muted transition-colors"
            aria-label="다음"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <span className="flex-1 text-center text-sm font-semibold truncate px-1">
          {titleText}
        </span>

        {/* View switcher */}
        <div className="flex gap-0.5 shrink-0">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              onClick={() => api()?.changeView(v.value)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                currentView === v.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Action slot (AI summary, download, …) */}
        {headerActions && (
          <div className="flex items-center gap-1 shrink-0 ml-1">{headerActions}</div>
        )}
      </div>

      {/* Calendar body with swipe detection */}
      <div
        className="flex-1 min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={false}
          events={calendarEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          datesSet={handleDatesSet}
          select={handleDateSelect}
          dateClick={handleDateClick}
          longPressDelay={300}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          loading={() => {}}
          height="100%"
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
    </div>
  );
}
