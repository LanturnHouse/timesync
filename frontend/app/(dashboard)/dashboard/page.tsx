"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarView } from "@/components/calendar/calendar-view";
import { EventModal } from "@/components/calendar/event-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Search, X } from "lucide-react";
import { getAccessToken } from "@/lib/auth";
import { CATEGORY_COLORS } from "@/lib/calendar-utils";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "meeting", label: "Meeting" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

async function downloadAllIcal() {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/events/export-all.ics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Failed to export calendar");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-timesync-calendar.ics";
  a.click();
  URL.revokeObjectURL(url);
}

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [defaultStart, setDefaultStart] = useState<string>("");
  const [defaultEnd, setDefaultEnd] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const debouncedSearch = useDebounce(searchInput, 300);

  const handleDateSelect = useCallback((start: string, end: string) => {
    setEditEventId(null);
    setDefaultStart(start);
    setDefaultEnd(end);
    setModalOpen(true);
  }, []);

  const handleEventClick = useCallback((eventId: string) => {
    setEditEventId(eventId);
    setDefaultStart("");
    setDefaultEnd("");
    setModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditEventId(null);
  }, []);

  return (
    <div className="relative p-6">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search events..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value === categoryFilter ? "" : cat.value)}
              className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border",
                categoryFilter === cat.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-muted-foreground border-border hover:border-foreground/40",
              ].join(" ")}
            >
              {cat.value && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[cat.value] }}
                />
              )}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Export */}
        <div className="ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadAllIcal().catch((err) => toast.error(err.message))
            }
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export All (.ics)
          </Button>
        </div>
      </div>

      <CalendarView
        onDateSelect={handleDateSelect}
        onEventClick={handleEventClick}
        categoryFilter={categoryFilter || undefined}
        search={debouncedSearch || undefined}
      />
      <EventModal
        open={modalOpen}
        onClose={handleClose}
        eventId={editEventId}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  );
}
