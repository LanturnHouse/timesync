"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED: "결제가 취소되었습니다.",
  PAY_PROCESS_ABORTED: "결제가 중단되었습니다.",
  REJECT_CARD_COMPANY: "카드사에서 결제를 거절했습니다.",
};

export default function BillingFailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code    = searchParams.get("code") ?? "";
  const message = searchParams.get("message") ?? "알 수 없는 오류가 발생했습니다.";

  const displayMessage = ERROR_MESSAGES[code] ?? message;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-4">
        <XCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">결제에 실패했습니다</h1>
        <p className="text-sm text-muted-foreground">{displayMessage}</p>
        {code && (
          <p className="text-xs text-muted-foreground font-mono">오류 코드: {code}</p>
        )}
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => router.push("/")}>
            홈으로
          </Button>
          <Button onClick={() => router.back()}>
            다시 시도
          </Button>
        </div>
      </div>
    </div>
  );
}
