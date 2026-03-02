"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import type { AuthTokens } from "@/types";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      router.push("/login");
      return;
    }

    apiFetch<AuthTokens>("/auth/google/", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then(async ({ access, refresh }) => {
        // login() sets tokens AND awaits fetchUser() so isAuthenticated
        // is true before we navigate — preventing the redirect-to-login race.
        await login(access, refresh);
        const pendingInvite = sessionStorage.getItem("pending_invite");
        if (pendingInvite) {
          sessionStorage.removeItem("pending_invite");
          router.push(`/invite/${pendingInvite}`);
        } else {
          router.push("/dashboard");
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [searchParams, router, login]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-muted-foreground">Signing you in...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
