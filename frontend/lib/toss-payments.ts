/**
 * Toss Payments v1 CDN 동적 로더
 * npm 패키지 대신 CDN 스크립트를 동적으로 로드합니다.
 */

export interface BillingAuthOptions {
  customerKey: string;
  successUrl: string;
  failUrl: string;
}

export interface TossPaymentsInstance {
  requestBillingAuth: (method: string, options: BillingAuthOptions) => Promise<void>;
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => TossPaymentsInstance;
  }
}

let loadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // 이미 로드된 경우
    if (typeof window !== "undefined" && window.TossPayments) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Toss Payments 스크립트 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function loadTossPayments(
  clientKey: string
): Promise<TossPaymentsInstance> {
  await loadScript();

  if (!window.TossPayments) {
    throw new Error("TossPayments SDK를 사용할 수 없습니다.");
  }

  return window.TossPayments(clientKey);
}
