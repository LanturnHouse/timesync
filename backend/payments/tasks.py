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


def _sync_group_tier(group):
    from django.db.models import Sum
    from .models import BoostSubscription
    total = BoostSubscription.objects.filter(
        group=group, status="active"
    ).aggregate(total=Sum("quantity"))["total"] or 0
    group.boost_count = total
    group.tier = group.computed_tier
    group.save(update_fields=["boost_count", "tier"])


def _charge_subscription(sub):
    """빌링키로 결제 실행 후 성공/실패 처리."""
    from notifications.utils import notify
    from .constants import PER_BOOST_PRICE
    from .models import SubscriptionPayment

    amount = PER_BOOST_PRICE * sub.quantity
    order_name = f"TimeSync 부스트 {sub.quantity}개 구독"
    order_id = str(uuid.uuid4())
    headers = _toss_auth_header()

    try:
        resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/{sub.billing_key}",
            headers=headers,
            json={
                "customerKey": sub.customer_key,
                "amount": amount,
                "orderId": order_id,
                "orderName": order_name,
            },
            timeout=10,
        )
    except requests.RequestException:
        resp = None

    now = timezone.now()

    if resp is not None and resp.status_code == 200:
        data = resp.json()
        sub.current_period_start = now
        sub.current_period_end = now + timedelta(days=30)
        sub.failed_attempts = 0
        sub.status = "active"
        sub.save(update_fields=[
            "current_period_start", "current_period_end", "failed_attempts", "status",
        ])

        SubscriptionPayment.objects.create(
            subscription=sub,
            order_id=order_id,
            payment_key=data.get("paymentKey", ""),
            amount=amount,
            status="success",
            toss_response=data,
        )
        _sync_group_tier(sub.group)
        notify(
            recipient=sub.user,
            verb="subscription_renewed",
            description=f"'{sub.group.name}' 부스트 {sub.quantity}개 구독이 갱신되었습니다.",
        )
    else:
        toss_resp = resp.json() if resp is not None else {}
        sub.failed_attempts += 1
        sub.status = "past_due"
        sub.save(update_fields=["failed_attempts", "status"])

        SubscriptionPayment.objects.create(
            subscription=sub,
            order_id=order_id,
            amount=amount,
            status="failed",
            toss_response=toss_resp,
        )
        _sync_group_tier(sub.group)
        notify(
            recipient=sub.user,
            verb="subscription_payment_failed",
            description=(
                f"'{sub.group.name}' 부스트 구독 결제에 실패했습니다. "
                "3일 내에 카드 정보를 확인해주세요."
            ),
        )


@shared_task
def charge_due_subscriptions():
    """매일 실행. 오늘이 갱신일인 구독을 자동 청구하거나 취소 확정."""
    from notifications.utils import notify
    from .models import BoostSubscription

    today = timezone.now().date()

    for sub in BoostSubscription.objects.filter(
        status="active",
        current_period_end__date=today,
        cancel_at_period_end=False,
    ).select_related("user", "group"):
        _charge_subscription(sub)

    for sub in BoostSubscription.objects.filter(
        status="active",
        current_period_end__date=today,
        cancel_at_period_end=True,
    ).select_related("user", "group"):
        sub.status = "cancelled"
        sub.save(update_fields=["status"])
        _sync_group_tier(sub.group)
        notify(
            recipient=sub.user,
            verb="subscription_cancelled",
            description=f"'{sub.group.name}' 부스트 {sub.quantity}개 구독이 종료되었습니다.",
        )

    return f"charge_due_subscriptions completed for date={today}"


@shared_task
def handle_expired_subscriptions():
    """매일 실행. 유예기간(3일) 만료된 past_due 구독을 expired 처리."""
    from notifications.utils import notify
    from .models import BoostSubscription

    grace_deadline = timezone.now() - timedelta(days=3)

    for sub in BoostSubscription.objects.filter(
        status="past_due",
        current_period_end__lte=grace_deadline,
    ).select_related("user", "group"):
        sub.status = "expired"
        sub.save(update_fields=["status"])
        _sync_group_tier(sub.group)
        notify(
            recipient=sub.user,
            verb="subscription_expired",
            description=f"'{sub.group.name}' 부스트 {sub.quantity}개 구독이 만료되었습니다.",
        )

    return "handle_expired_subscriptions completed"
