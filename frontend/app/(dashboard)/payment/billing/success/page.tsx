"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirmBilling } from "@/hooks/use-subscriptions";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmBilling = useConfirmBilling();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const calledRef = useRef(false);

  const authKey     = searchParams.get("authKey") ?? "";
  const customerKey = searchParams.get("customerKey") ?? "";
  const quantity    = Number(searchParams.get("quantity") ?? "1");
  const groupId     = searchParams.get("groupId") ?? "";

  useEffect(() => {
    if (!authKey || !customerKey || !groupId) {
      setState("error");
      setErrorMessage("결제 정보가 올바르지 않습니다.");
      return;
    }

    if (calledRef.current) return;
    calledRef.current = true;

    confirmBilling.mutate(
      { auth_key: authKey, customer_key: customerKey, quantity, group_id: groupId },
      {
        onSuccess: () => {
          setState("success");
          toast.success(`부스트 ${quantity}개 구독이 시작되었습니다! 🎉`);
          setTimeout(() => router.push(`/groups/${groupId}`), 1500);
        },
        onError: (err) => {
          setState("error");
          setErrorMessage(err instanceof Error ? err.message : "구독 처리 중 오류가 발생했습니다.");
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-4">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h1 className="text-xl font-semibold">구독 처리 중...</h1>
            <p className="text-sm text-muted-foreground">잠시만 기다려주세요.</p>
          </>
        )}

        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-xl font-semibold">구독 완료!</h1>
            <p className="text-sm text-muted-foreground">그룹 페이지로 이동합니다...</p>
          </>
        )}

        {state === "error" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="text-xl font-semibold">구독 처리 실패</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.push("/")}>홈으로</Button>
              {groupId && (
                <Button onClick={() => router.push(`/groups/${groupId}`)}>그룹으로 이동</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
