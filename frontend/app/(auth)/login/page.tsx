"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  // 인증 여부 확인 중이거나 이미 인증됐으면 스피너 표시
  if (isLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TimeSync</CardTitle>
          <CardDescription>
            Sign in to manage your calendars
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleLoginButton />
        </CardContent>
      </Card>
    </div>
  );
}
