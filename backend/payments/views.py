import base64
import uuid

import requests
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from groups.models import Group, GroupMember

from .constants import MAX_BOOSTS_PER_SUBSCRIPTION, PER_BOOST_PRICE, TIER_THRESHOLDS
from .models import BoostSubscription, SubscriptionPayment
from .serializers import BoostSubscriptionSerializer


def _toss_auth_header():
    secret = settings.TOSS_SECRET_KEY + ":"
    encoded = base64.b64encode(secret.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _is_member(user, group):
    return group.owner == user or GroupMember.objects.filter(
        group=group, user=user
    ).exists()


def _sync_group_tier(group):
    """활성 구독들의 quantity 합계로 boost_count와 tier를 동기화."""
    total = BoostSubscription.objects.filter(
        group=group, status="active"
    ).aggregate(total=Sum("quantity"))["total"] or 0
    group.boost_count = total
    group.tier = group.computed_tier
    group.save(update_fields=["boost_count", "tier"])


class PlansView(APIView):
    """GET /api/payments/plans/ — 부스트 가격 정보"""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "per_boost_price": PER_BOOST_PRICE,
            "max_quantity": MAX_BOOSTS_PER_SUBSCRIPTION,
            "tier_thresholds": TIER_THRESHOLDS,
        })


class PrepareBillingView(APIView):
    """POST /api/payments/prepare-billing/
    Body: { quantity, group_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        quantity = int(request.data.get("quantity", 1))
        group_id = request.data.get("group_id")

        if quantity < 1 or quantity > MAX_BOOSTS_PER_SUBSCRIPTION:
            return Response(
                {"detail": f"부스트 수는 1~{MAX_BOOSTS_PER_SUBSCRIPTION}개 사이여야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "그룹을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_member(request.user, group):
            return Response({"detail": "그룹 멤버만 부스트를 구독할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        amount = PER_BOOST_PRICE * quantity
        customer_key = f"{request.user.id}_{group_id}_{uuid.uuid4().hex[:8]}"

        return Response({
            "customer_key": customer_key,
            "quantity": quantity,
            "amount": amount,
            "order_name": f"TimeSync 부스트 {quantity}개 구독",
        })


class ConfirmBillingView(APIView):
    """POST /api/payments/confirm-billing/
    Body: { auth_key, customer_key, quantity, group_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        auth_key     = request.data.get("auth_key")
        customer_key = request.data.get("customer_key")
        quantity     = int(request.data.get("quantity", 1))
        group_id     = request.data.get("group_id")

        if not all([auth_key, customer_key, group_id]):
            return Response(
                {"detail": "auth_key, customer_key, group_id 는 필수입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 1 or quantity > MAX_BOOSTS_PER_SUBSCRIPTION:
            return Response(
                {"detail": f"부스트 수는 1~{MAX_BOOSTS_PER_SUBSCRIPTION}개 사이여야 합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "그룹을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_member(request.user, group):
            return Response({"detail": "그룹 멤버만 부스트를 구독할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        headers = _toss_auth_header()
        amount = PER_BOOST_PRICE * quantity
        order_name = f"TimeSync 부스트 {quantity}개 구독"

        # Step 1: authKey → billingKey
        billing_resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/authorizations/{auth_key}",
            headers=headers,
            json={"customerKey": customer_key},
            timeout=10,
        )
        if billing_resp.status_code != 200:
            return Response(
                {"detail": "빌링키 발급에 실패했습니다.", "toss_error": billing_resp.json()},
                status=status.HTTP_400_BAD_REQUEST,
            )

        billing_key = billing_resp.json().get("billingKey")
        if not billing_key:
            return Response({"detail": "빌링키를 받지 못했습니다."}, status=status.HTTP_400_BAD_REQUEST)

        # Step 2: 첫 결제
        order_id = str(uuid.uuid4())
        charge_resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/{billing_key}",
            headers=headers,
            json={
                "customerKey": customer_key,
                "amount": amount,
                "orderId": order_id,
                "orderName": order_name,
            },
            timeout=10,
        )

        now = timezone.now()

        if charge_resp.status_code == 200:
            charge_data = charge_resp.json()

            sub = BoostSubscription.objects.create(
                user=request.user,
                group=group,
                quantity=quantity,
                status="active",
                billing_key=billing_key,
                customer_key=customer_key,
                current_period_start=now,
                current_period_end=now + timezone.timedelta(days=30),
            )

            SubscriptionPayment.objects.create(
                subscription=sub,
                order_id=order_id,
                payment_key=charge_data.get("paymentKey", ""),
                amount=amount,
                status="success",
                toss_response=charge_data,
            )

            _sync_group_tier(group)

            serializer = BoostSubscriptionSerializer(sub)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            return Response(
                {"detail": "첫 결제에 실패했습니다.", "toss_error": charge_resp.json()},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CancelSubscriptionView(APIView):
    """POST /api/payments/cancel/
    Body: { subscription_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        subscription_id = request.data.get("subscription_id")

        try:
            sub = BoostSubscription.objects.select_related("group").get(
                pk=subscription_id, user=request.user
            )
        except BoostSubscription.DoesNotExist:
            return Response({"detail": "구독을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        if sub.status != "active":
            return Response({"detail": "활성 구독만 취소할 수 있습니다."}, status=status.HTTP_400_BAD_REQUEST)

        sub.cancel_at_period_end = True
        sub.save(update_fields=["cancel_at_period_end"])

        return Response({
            "message": "구독 취소가 예약되었습니다. 현재 구독 기간 종료 후 부스트가 제거됩니다.",
            "expires_at": sub.current_period_end,
        })


class SubscriptionListView(APIView):
    """GET /api/payments/subscriptions/?group={group_id} — 그룹 내 전체 활성 구독"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response({"detail": "group 파라미터가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response({"detail": "그룹을 찾을 수 없습니다."}, status=status.HTTP_404_NOT_FOUND)

        if not _is_member(request.user, group):
            return Response({"detail": "그룹 멤버만 구독 정보를 조회할 수 있습니다."}, status=status.HTTP_403_FORBIDDEN)

        subs = (
            BoostSubscription.objects
            .filter(group=group, status__in=["active", "past_due"])
            .select_related("user")
            .prefetch_related("payments")
            .order_by("-created_at")
        )
        return Response(BoostSubscriptionSerializer(subs, many=True).data)


class MySubscriptionsView(APIView):
    """GET /api/payments/my-subscriptions/?group={group_id} — 내 구독 목록"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get("group")
        qs = BoostSubscription.objects.filter(
            user=request.user, status__in=["active", "past_due"]
        ).select_related("group").prefetch_related("payments").order_by("-created_at")

        if group_id:
            qs = qs.filter(group_id=group_id)

        return Response(BoostSubscriptionSerializer(qs, many=True).data)
