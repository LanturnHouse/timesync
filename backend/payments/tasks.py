import base64
import uuid
from datetime import timedelta

import requests
from celery import shared_task
from django.conf import settings
from django.utils import timezone


def _toss_auth_header():
    secret = settings.TOSS_SECRET_KEY + ":"
    encoded = base64.b64encode(secret.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _charge_subscription(sub):
    """빌링키로 결제 실행 후 성공/실패 처리."""
    from notifications.utils import notify
    from .constants import PLAN_CONFIG
    from .models import SubscriptionPayment

    cfg = PLAN_CONFIG[sub.plan]
    order_id = str(uuid.uuid4())
    headers = _toss_auth_header()

    try:
        resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/{sub.billing_key}",
            headers=headers,
            json={
                "customerKey": sub.customer_key,
                "amount": cfg["amount"],
                "orderId": order_id,
                "orderName": cfg["order_name"],
            },
            timeout=10,
        )
    except requests.RequestException:
        # 네트워크 오류 → 실패로 처리
        resp = None

    now = timezone.now()

    if resp is not None and resp.status_code == 200:
        data = resp.json()
        # 결제 성공
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=30)
        sub.failed_attempts = 0
        sub.status = "active"
        sub.save(update_fields=[
            "current_period_start", "current_period_end",
            "failed_attempts", "status",
        ])
        sub.group.boost_count += 1
        sub.group.save(update_fields=["boost_count"])

        SubscriptionPayment.objects.create(
            subscription=sub,
            order_id=order_id,
            payment_key=data.get("paymentKey", ""),
            amount=cfg["amount"],
            status="success",
            toss_response=data,
        )
        notify(
            recipient=sub.user,
            verb="subscription_renewed",
            description=f"'{sub.group.name}' {cfg['label']} 구독이 갱신되었습니다.",
        )
    else:
        # 결제 실패 → past_due
        toss_resp = resp.json() if resp is not None else {}
        sub.failed_attempts += 1
        sub.status = "past_due"
        sub.save(update_fields=["failed_attempts", "status"])

        SubscriptionPayment.objects.create(
            subscription=sub,
            order_id=order_id,
            amount=cfg["amount"],
            status="failed",
            toss_response=toss_resp,
        )
        notify(
            recipient=sub.user,
            verb="subscription_payment_failed",
            description=(
                f"'{sub.group.name}' 구독 결제에 실패했습니다. "
                "3일 내에 카드 정보를 확인해주세요. 해결되지 않으면 구독이 만료됩니다."
            ),
        )


@shared_task
def charge_due_subscriptions():
    """매일 실행. 오늘이 갱신일인 구독을 자동 청구하거나 취소 확정."""
    from .models import BoostSubscription

    today = timezone.now().date()

    # 자동 갱신 대상
    for sub in BoostSubscription.objects.filter(
        status="active",
        current_period_end__date=today,
        cancel_at_period_end=False,
    ).select_related("user", "group"):
        _charge_subscription(sub)

    # 취소 예정 구독 → cancelled 처리 + tier 복귀
    from notifications.utils import notify

    for sub in BoostSubscription.objects.filter(
        status="active",
        current_period_end__date=today,
        cancel_at_period_end=True,
    ).select_related("user", "group"):
        sub.status = "cancelled"
        sub.save(update_fields=["status"])
        sub.group.tier = "starter"
        sub.group.save(update_fields=["tier"])
        notify(
            recipient=sub.user,
            verb="subscription_cancelled",
            description=(
                f"'{sub.group.name}' 구독이 종료되었습니다. "
                "그룹 티어가 Starter로 변경됩니다."
            ),
        )

    return f"charge_due_subscriptions completed for date={today}"


@shared_task
def handle_expired_subscriptions():
    """매일 실행. 유예기간(3일) 만료된 past_due 구독을 expired 처리."""
    from .models import BoostSubscription
    from notifications.utils import notify

    grace_deadline = timezone.now() - timedelta(days=3)

    for sub in BoostSubscription.objects.filter(
        status="past_due",
        current_period_end__lte=grace_deadline,
    ).select_related("user", "group"):
        sub.status = "expired"
        sub.save(update_fields=["status"])
        sub.group.tier = "starter"
        sub.group.save(update_fields=["tier"])
        notify(
            recipient=sub.user,
            verb="subscription_expired",
            description=(
                f"'{sub.group.name}' 구독이 만료되었습니다. "
                "그룹 티어가 Starter로 초기화됩니다."
            ),
        )

    return f"handle_expired_subscriptions completed"
