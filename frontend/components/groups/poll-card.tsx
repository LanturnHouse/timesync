"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useVote, useUnvote, useDeletePoll } from "@/hooks/use-polls";
import { useAuth } from "@/providers/auth-provider";
import type { Poll } from "@/types";
import { Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const { user } = useAuth();
  const voteMutation = useVote();
  const unvoteMutation = useUnvote();
  const deletePoll = useDeletePoll();

  const isCreator = poll.creator === user?.id;
  const isClosed = poll.is_closed;
  const totalVotes = poll.total_votes;

  const handleVote = (optionId: string, currentlyVoted: boolean) => {
    if (isClosed) return;
    if (currentlyVoted) {
      unvoteMutation.mutate(
        { pollId: poll.id, optionId },
        { onError: (err) => toast.error(err.message) }
      );
    } else {
      voteMutation.mutate(
        { pollId: poll.id, optionId },
        { onError: (err) => toast.error(err.message) }
      );
    }
  };

  const handleDelete = () => {
    deletePoll.mutate(poll.id, {
      onSuccess: () => toast.success("Poll deleted"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h4 className="font-medium">{poll.question}</h4>
          <p className="text-xs text-muted-foreground">
            by {poll.creator_display_name || poll.creator_email} ·{" "}
            {totalVotes} vote{totalVotes !== 1 && "s"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {poll.is_multiple_choice && (
            <Badge variant="outline" className="text-xs">
              Multi
            </Badge>
          )}
          {isClosed && (
            <Badge variant="secondary" className="text-xs">
              <Clock className="mr-1 h-3 w-3" />
              Closed
            </Badge>
          )}
          {isCreator && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleDelete}
              disabled={deletePoll.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((option) => {
          const percentage =
            totalVotes > 0
              ? Math.round((option.vote_count / totalVotes) * 100)
              : 0;

          return (
            <button
              key={option.id}
              className={`w-full rounded-md border p-2.5 text-left transition-colors ${
                option.voted_by_me
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              } ${isClosed ? "cursor-default" : "cursor-pointer"}`}
              onClick={() => handleVote(option.id, option.voted_by_me)}
              disabled={
                isClosed ||
                voteMutation.isPending ||
                unvoteMutation.isPending
              }
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {option.voted_by_me && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className="text-sm">{option.text}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {percentage}%
                </span>
              </div>
              <Progress value={percentage} className="h-1.5" />
            </button>
          );
        })}
      </div>

      {poll.closes_at && !isClosed && (
        <p className="text-xs text-muted-foreground">
          Closes {new Date(poll.closes_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
