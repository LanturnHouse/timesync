"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";
import type { AuthTokens } from "@/types";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.replace("/login");
      return;
    }

    apiFetch<AuthTokens>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then(async ({ access, refresh }) => {
        await login(access, refresh);
        const pendingInvite = sessionStorage.getItem("pending_invite");
        if (pendingInvite) {
          sessionStorage.removeItem("pending_invite");
          router.replace(`/invite/${pendingInvite}`);
        } else {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [searchParams, router, login]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">로그인 중...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">로그인 중...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
