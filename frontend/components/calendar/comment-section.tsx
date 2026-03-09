"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/use-comments";
import { useAuth } from "@/providers/auth-provider";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface CommentSectionProps {
  eventId: string;
}

export function CommentSection({ eventId }: CommentSectionProps) {
  const { user } = useAuth();
  const { data, isLoading } = useComments(eventId);
  const comments = data?.results ?? [];
  const createComment = useCreateComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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
    <div className="h-full flex flex-col">

      {/* ── 댓글 목록 (스크롤, 상단 여백 포함) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">아직 댓글이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isAuthor = comment.author === user?.id;
              const isEditing = editingId === comment.id;
              const initials = comment.author_display_name
                ? comment.author_display_name.charAt(0).toUpperCase()
                : comment.author_email.charAt(0).toUpperCase();

              return (
                <div key={comment.id} className="flex gap-2.5">
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
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => startEdit(comment.id, comment.content)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 댓글 입력창 (하단 고정) ── */}
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
  );
}
