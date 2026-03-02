"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useAcceptInvitation } from "@/hooks/use-groups";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GroupInvitation } from "@/types";
import { toast } from "sonner";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const acceptInvitation = useAcceptInvitation();

  const [invitation, setInvitation] = useState<GroupInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const data = await apiFetch<GroupInvitation>(
          `/groups/invitations/${token}/`
        );
        setInvitation(data);
      } catch {
        setError("This invitation is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvitation();
  }, [token]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Store invite token and redirect to login
      sessionStorage.setItem("pending_invite", token);
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, token, router]);

  const handleAccept = () => {
    acceptInvitation.mutate(token, {
      onSuccess: (data) => {
        sessionStorage.removeItem("pending_invite");
        toast.success("Joined the group!");
        router.push(`/groups/${data.group_id}`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-4 rounded-lg border p-6 text-center">
          <h1 className="text-xl font-semibold">Invitation Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-6 text-center">
        <h1 className="text-xl font-semibold">Group Invitation</h1>
        <p className="text-muted-foreground">
          You&apos;ve been invited to join{" "}
          <span className="font-medium text-foreground">
            {invitation?.group_name}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          Invited by {invitation?.invited_by_email}
        </p>
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
          >
            Decline
          </Button>
          <Button
            onClick={handleAccept}
            disabled={acceptInvitation.isPending}
          >
            {acceptInvitation.isPending ? "Joining..." : "Accept & Join"}
          </Button>
        </div>
      </div>
    </div>
  );
}
