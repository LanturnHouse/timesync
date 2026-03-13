"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  useTemplates,
  useCreateFromTemplate,
  useDeleteEvent,
  useUpdateEvent,
} from "@/hooks/use-events";
import type { Event } from "@/types";
import { Calendar, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "none", label: "없음" },
  { value: "work", label: "Work" },
  { value: "personal", label: "Personal" },
  { value: "meeting", label: "Meeting" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

const COLORS = [
  { value: "none", label: "기본" },
  { value: "#3b82f6", label: "파랑" },
  { value: "#ef4444", label: "빨강" },
  { value: "#10b981", label: "초록" },
  { value: "#f59e0b", label: "황색" },
  { value: "#8b5cf6", label: "보라" },
  { value: "#ec4899", label: "분홍" },
  { value: "#06b6d4", label: "청록" },
];

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const createFromTemplate = useCreateFromTemplate();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  // ── Use dialog ──────────────────────────────────────────────────────────
  const [useOpen, setUseOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const openUseDialog = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setStartAt("");
    setEndAt("");
    setUseOpen(true);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplateId || !startAt || !endAt) {
      toast.error("시작/종료 시간을 입력해주세요");
      return;
    }
    createFromTemplate.mutate(
      {
        templateId: selectedTemplateId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("템플릿으로 이벤트를 생성했습니다");
          setUseOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ── Edit dialog ─────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editColor, setEditColor] = useState("");

  const openEditDialog = (t: Event) => {
    setEditingId(t.id);
    setEditTitle(t.title.replace(" (Template)", ""));
    setEditDescription(t.description ?? "");
    setEditCategory(t.category || "none");
    setEditColor(t.color || "none");
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editingId || !editTitle.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }
    updateEvent.mutate(
      {
        id: editingId,
        title: editTitle.trim(),
        description: editDescription,
        category: editCategory === "none" ? "" : editCategory,
        color: editColor === "none" ? "" : editColor,
      },
      {
        onSuccess: () => {
          toast.success("템플릿이 수정되었습니다");
          setEditOpen(false);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    deleteEvent.mutate({ id }, {
      onSuccess: () => toast.success("템플릿이 삭제되었습니다"),
      onError: (err) => toast.error(err.message),
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">이벤트 템플릿</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        저장된 템플릿으로 빠르게 일정을 만드세요.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates?.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full">
            템플릿이 없습니다. 일정을 열고 &quot;템플릿으로 저장&quot; 버튼을 눌러 추가하세요.
          </p>
        )}
        {templates?.map((t) => (
          <div key={t.id} className="rounded-lg border p-4 space-y-3">
            {/* Header: title + action buttons */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium truncate">
                  {t.title.replace(" (Template)", "")}
                </h3>
                {t.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEditDialog(t)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {t.category && <Badge variant="outline">{t.category}</Badge>}
              {t.color && (
                <div
                  className="h-5 w-5 rounded-full border"
                  style={{ backgroundColor: t.color }}
                />
              )}
              {t.group_name && (
                <Badge variant="secondary">{t.group_name}</Badge>
              )}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {Math.round(
                  (new Date(t.end_at).getTime() - new Date(t.start_at).getTime()) / 60000
                )}분 duration
              </span>
            </div>

            {/* Use button */}
            <Button className="w-full" size="sm" onClick={() => openUseDialog(t.id)}>
              <Calendar className="mr-2 h-3.5 w-3.5" />
              사용하기
            </Button>
          </div>
        ))}
      </div>

      {/* ── Use Template Dialog ── */}
      <Dialog open={useOpen} onOpenChange={(o) => !o && setUseOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>템플릿으로 이벤트 생성</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tpl-start">시작 시간</Label>
              <Input
                id="tpl-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tpl-end">종료 시간</Label>
              <Input
                id="tpl-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUseTemplate} disabled={createFromTemplate.isPending}>
              {createFromTemplate.isPending ? "생성 중..." : "이벤트 생성"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Template Dialog ── */}
      <Dialog open={editOpen} onOpenChange={(o) => !o && setEditOpen(false)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>템플릿 수정</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">제목 *</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="템플릿 제목"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">설명</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="선택 사항"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>카테고리</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>색상</Label>
                <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="색상 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          {c.value && (
                            <div
                              className="h-3.5 w-3.5 rounded-full border"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEditSave} disabled={updateEvent.isPending}>
              {updateEvent.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
