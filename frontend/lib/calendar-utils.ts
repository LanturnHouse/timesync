import type { Event as CalendarEvent, FullCalendarEvent } from "@/types";

const GROUP_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

export const CATEGORY_COLORS: Record<string, string> = {
  work:     "#3b82f6", // blue
  personal: "#10b981", // green
  meeting:  "#f59e0b", // amber
  social:   "#ec4899", // pink
  other:    "#8b5cf6", // purple
};

const groupColorMap = new Map<string, string>();

function getGroupColor(groupId: string): string {
  if (!groupColorMap.has(groupId)) {
    groupColorMap.set(groupId, GROUP_COLORS[groupColorMap.size % GROUP_COLORS.length]);
  }
  return groupColorMap.get(groupId)!;
}

export function toFullCalendarEvent(event: CalendarEvent): FullCalendarEvent {
  const color =
    event.color ||
    (event.category && CATEGORY_COLORS[event.category]) ||
    (event.group ? getGroupColor(event.group) : "#3b82f6");

  const isTentative = event.status === "tentative";

  return {
    id: event.id,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    backgroundColor: isTentative ? `${color}66` : color,  // 40% opacity for tentative
    borderColor: isTentative ? `${color}88` : color,
    classNames: isTentative ? ["fc-event-tentative"] : [],
    extendedProps: {
      creator: event.creator,
      creator_email: event.creator_email,
      group: event.group,
      group_name: event.group_name,
      description: event.description,
      category: event.category,
      is_template: event.is_template,
      is_tombstone: event.is_tombstone ?? false,
      status: event.status ?? "confirmed",
    },
  };
}

export function toFullCalendarEvents(events: CalendarEvent[]): FullCalendarEvent[] {
  // Filter out templates and tombstones (belt-and-suspenders; backend also filters)
  return events
    .filter((e) => !e.is_template && !e.is_tombstone)
    .map(toFullCalendarEvent);
}
