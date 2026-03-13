"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/use-comments";
import { useEventLogs } from "@/hooks/use-events";
import { useAuth } from "@/providers/auth-provider";
import { MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { Comment, EventLog } from "@/types";

interface CommentSectionProps {
  eventId: string;
}

// Merge comments and logs into a unified timeline
type FeedItem =
  | { kind: "comment"; data: Comment }
  | { kind: "log"; data: EventLog };

function buildFeed(comments: Comment[], logs: EventLog[]): FeedItem[] {
  const items: FeedItem[] = [
    ...comments.map((c) => ({ kind: "comment" as const, data: c })),
    ...logs.map((l) => ({ kind: "log" as const, data: l })),
  ];
  return items.sort(
    (a, b) =>
      new Date(a.data.created_at).getTime() -
      new Date(b.data.created_at).getTime()
  );
}

const LOG_ACTION_LABELS: Record<string, string> = {
  updated: "일정을 수정했습니다",
  status_changed: "일정 상태를 변경했습니다",
  rsvp_changed: "참석 응답을 변경했습니다",
};

function logDetail(log: EventLog): string {
  const d = log.detail as Record<string, unknown>;
  if (log.action === "status_changed") {
    const from = d.from === "confirmed" ? "확정" : "미정";
    const to = d.to === "confirmed" ? "확정" : "미정";
    return ` (${from} → ${to})`;
  }
  if (log.action === "rsvp_changed") {
    const statusMap: Record<string, string> = {
      accepted: "참여",
      tentative: "미정",
      declined: "불가",
    };
    const s = typeof d.status === "string" ? statusMap[d.status] ?? d.status : "취소";
    return ` → ${s}`;
  }
  if (log.action === "updated" && Array.isArray(d.fields) && d.fields.length > 0) {
    return ` (${(d.fields as string[]).join(", ")})`;
  }
  return "";
}

export function CommentSection({ eventId }: CommentSectionProps) {
  const { user } = useAuth();
  const { data, isLoading: commentsLoading } = useComments(eventId);
  const { data: logs, isLoading: logsLoading } = useEventLogs(eventId);
  const comments = data?.results ?? [];
  const eventLogs = logs ?? [];

  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const isLoading = commentsLoading || logsLoading;
  const feed = buildFeed(comments, eventLogs);

  const handleCreate = () => {
    if (!newContent.trim()) return;
    createComment.mutate(
      { eventId, content: newContent.trim() },
      {
        onSuccess: () => setNewContent(""),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleUpdate = (commentId: string) => {
    if (!editContent.trim()) return;
    updateComment.mutate(
      { eventId, commentId, content: editContent.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditContent("");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate(
      { eventId, commentId },
      { onError: (err) => toast.error(err.message) }
    );
  };

  const startEdit = (commentId: string, content: string) => {
    setEditingId(commentId);
    setEditContent(content);
  };

  return (
    <>
      <div className="h-full flex flex-col">
        {/* ── 피드 목록 (댓글 + 로그) ── */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {feed.map((item) => {
                if (item.kind === "log") {
                  const log = item.data;
                  const actorName = log.actor_display_name || log.actor_email || "시스템";
                  const initials = actorName.charAt(0).toUpperCase();
                  return (
                    <div key={`log-${log.id}`} className="flex gap-2 items-start">
                      <Avatar className="h-6 w-6 mt-0.5 shrink-0">
                        <AvatarImage src={log.actor_avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-muted">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <span className="font-medium text-foreground/70">{actorName}</span>
                          {" "}
                          {LOG_ACTION_LABELS[log.action] ?? log.action}
                          <span className="text-muted-foreground/70">{logDetail(log)}</span>
                          <span className="ml-2 text-[11px] text-muted-foreground/50">
                            {new Date(log.created_at).toLocaleString("ko-KR", {
                              month: "numeric", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                }

                const comment = item.data;
                const isAuthor = comment.author === user?.id;
                const isEditing = editingId === comment.id;
                const initials = comment.author_display_name
                  ? comment.author_display_name.charAt(0).toUpperCase()
                  : comment.author_email.charAt(0).toUpperCase();

                return (
                  <div key={`comment-${comment.id}`} className="flex gap-2.5">
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                      <AvatarImage src={comment.author_avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">
                          {comment.author_display_name || comment.author_email}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(comment.created_at).toLocaleString("ko-KR", {
                            month: "numeric", day: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {isEditing ? (
                        <div className="mt-1 space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdate(comment.id)}
                              disabled={updateComment.isPending}
                            >
                              저장
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-0.5 text-sm leading-relaxed">{comment.content}</p>
                      )}
                    </div>
                    {isAuthor && !isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(comment.id, comment.content)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTargetId(comment.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 댓글 입력창 ── */}
        <div className="shrink-0 pt-3 border-t mt-3 flex gap-2 items-end">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="댓글을 입력하세요… (Enter로 전송, Shift+Enter로 줄바꿈)"
            rows={2}
            className="text-sm flex-1 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button
            onClick={handleCreate}
            disabled={createComment.isPending || !newContent.trim()}
            size="sm"
            className="shrink-0 self-end"
          >
            전송
          </Button>
        </div>
      </div>

      {/* ── 삭제 확인 다이얼로그 ── */}
      <AlertDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>댓글 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 댓글을 삭제하시겠습니까? 삭제된 댓글은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteTargetId) {
                  handleDelete(deleteTargetId);
                  setDeleteTargetId(null);
                }
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
