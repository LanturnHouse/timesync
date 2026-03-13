"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { useScheduleSummary } from "@/hooks/use-events";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month";

const TABS: { value: Period; label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
];

// period별로 별도 컴포넌트로 분리 → 탭 전환 시 새 인스턴스 마운트 → 자동 fetch
function SummaryContent({ period }: { period: Period }) {
  const query = useScheduleSummary(period);

  return (
    <div className="rounded-lg bg-muted/50 p-3 min-h-[80px]">
      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-xs">AI 요약 생성 중…</span>
        </div>
      ) : query.isError ? (
        <p className="text-xs text-destructive">요약을 불러오지 못했습니다.</p>
      ) : query.data ? (
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {query.data.summary}
        </p>
      ) : null}
    </div>
  );
}

export function AiSummaryPopover() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("week");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">일정 요약</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        {/* 기간 탭 */}
        <div className="flex gap-1 mb-3">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setPeriod(t.value)}
              className={cn(
                "flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                period === t.value
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 요약 내용 — key로 period 변경 시 강제 리마운트 */}
        <SummaryContent key={period} period={period} />
      </PopoverContent>
    </Popover>
  );
}
