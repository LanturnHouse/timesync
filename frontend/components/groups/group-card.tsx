"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Group } from "@/types";

const TIER_LABELS: Record<string, string> = {
  starter: "Starter",
  lv1: "Level 1",
  lv2: "Level 2",
  lv3: "Level 3",
};

export function GroupCard({ group }: { group: Group }) {
  return (
    <Link
      href={`/groups/${group.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{group.name}</h3>
        {group.tier !== "starter" && (
          <Badge variant="secondary">{TIER_LABELS[group.tier]}</Badge>
        )}
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>{group.member_count} members</span>
      </div>
    </Link>
  );
}
