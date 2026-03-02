from django.conf import settings
from django.db import models

from common.models import TimeStampedModel
from .constants import PLAN_CHOICES


class BoostSubscription(TimeStampedModel):
    class StatusChoices(models.TextChoices):
        ACTIVE    = "active",    "Active"
        PAST_DUE  = "past_due",  "Past Due"      # 결제 실패, 3일 유예 중
        EXPIRED   = "expired",   "Expired"       # 유예 기간 만료 → tier = starter
        CANCELLED = "cancelled", "Cancelled"     # 기간 만료 후 취소 확정

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="boost_subscriptions",
    )
    group = models.OneToOneField(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="boost_subscription",
    )
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES)
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.ACTIVE,
    )

    # Toss Payments
    billing_key  = models.CharField(max_length=200)         # 비공개, 자동 청구용
    customer_key = models.CharField(max_length=200)         # str(user.id)

    # 구독 기간
    current_period_start = models.DateTimeField()
    current_period_end   = models.DateTimeField()           # 다음 결제일 = 만료일
    cancel_at_period_end = models.BooleanField(default=False)
    failed_attempts      = models.IntegerField(default=0)   # 연속 결제 실패 횟수

    class Meta:
        db_table = "boost_subscriptions"

    def __str__(self):
        return f"{self.group.name} — {self.plan} ({self.status})"


class SubscriptionPayment(TimeStampedModel):
    class StatusChoices(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED  = "failed",  "Failed"

    subscription  = models.ForeignKey(
        BoostSubscription,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    order_id    = models.CharField(max_length=64, unique=True)
    payment_key = models.CharField(max_length=200, blank=True)
    amount      = models.IntegerField()
    status      = models.CharField(max_length=10, choices=StatusChoices.choices)
    toss_response = models.JSONField(default=dict)

    class Meta:
        db_table = "subscription_payments"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.order_id} — {self.status} ₩{self.amount:,}"
