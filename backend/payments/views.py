import base64
import uuid

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from groups.models import Group, GroupMember

from .constants import PLAN_CONFIG
from .models import BoostSubscription, SubscriptionPayment
from .serializers import BoostSubscriptionSerializer


def _toss_auth_header():
    """Toss Payments Basic 인증 헤더 생성."""
    secret = settings.TOSS_SECRET_KEY + ":"
    encoded = base64.b64encode(secret.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _is_admin_or_owner(user, group):
    """사용자가 그룹 오너 또는 어드민인지 확인."""
    if group.owner == user:
        return True
    return GroupMember.objects.filter(
        group=group, user=user, role=GroupMember.RoleChoices.ADMIN
    ).exists()


class PlansView(APIView):
    """GET /api/payments/plans/ — 구독 플랜 목록 (인증 불필요)"""
    permission_classes = [AllowAny]

    def get(self, request):
        plans = [
            {"plan": key, **cfg}
            for key, cfg in PLAN_CONFIG.items()
        ]
        return Response(plans)


class PrepareBillingView(APIView):
    """POST /api/payments/prepare-billing/
    빌링키 발급 전 준비 단계. customer_key와 결제 정보를 반환.
    Body: { plan, group_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get("plan")
        group_id = request.data.get("group_id")

        if plan not in PLAN_CONFIG:
            return Response(
                {"detail": "유효하지 않은 플랜입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "그룹을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _is_admin_or_owner(request.user, group):
            return Response(
                {"detail": "그룹 어드민 또는 오너만 구독을 관리할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 이미 활성 구독이 있는지 확인
        if BoostSubscription.objects.filter(group=group, status="active").exists():
            return Response(
                {"detail": "이미 활성 구독이 있습니다. 기존 구독을 취소 후 새로 구독하세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cfg = PLAN_CONFIG[plan]
        customer_key = str(request.user.id)

        return Response({
            "customer_key": customer_key,
            "plan": plan,
            "amount": cfg["amount"],
            "order_name": cfg["order_name"],
        })


class ConfirmBillingView(APIView):
    """POST /api/payments/confirm-billing/
    Toss 빌링키 발급 완료 후 첫 결제 실행.
    Body: { auth_key, customer_key, plan, group_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        auth_key    = request.data.get("auth_key")
        customer_key = request.data.get("customer_key")
        plan        = request.data.get("plan")
        group_id    = request.data.get("group_id")

        if not all([auth_key, customer_key, plan, group_id]):
            return Response(
                {"detail": "auth_key, customer_key, plan, group_id 는 필수입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if plan not in PLAN_CONFIG:
            return Response(
                {"detail": "유효하지 않은 플랜입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "그룹을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _is_admin_or_owner(request.user, group):
            return Response(
                {"detail": "그룹 어드민 또는 오너만 구독을 관리할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # 이미 활성 구독이 있는지 확인
        if BoostSubscription.objects.filter(group=group, status="active").exists():
            return Response(
                {"detail": "이미 활성 구독이 있습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        headers = _toss_auth_header()

        # Step 1: authKey → billingKey 발급
        billing_auth_resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/authorizations/{auth_key}",
            headers=headers,
            json={"customerKey": customer_key},
            timeout=10,
        )
        if billing_auth_resp.status_code != 200:
            return Response(
                {"detail": "빌링키 발급에 실패했습니다.", "toss_error": billing_auth_resp.json()},
                status=status.HTTP_400_BAD_REQUEST,
            )

        billing_key = billing_auth_resp.json().get("billingKey")
        if not billing_key:
            return Response(
                {"detail": "빌링키를 받지 못했습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Step 2: 첫 결제 실행
        cfg = PLAN_CONFIG[plan]
        order_id = str(uuid.uuid4())

        charge_resp = requests.post(
            f"https://api.tosspayments.com/v1/billing/{billing_key}",
            headers=headers,
            json={
                "customerKey": customer_key,
                "amount": cfg["amount"],
                "orderId": order_id,
                "orderName": cfg["order_name"],
            },
            timeout=10,
        )

        now = timezone.now()

        if charge_resp.status_code == 200:
            charge_data = charge_resp.json()
            payment_key = charge_data.get("paymentKey", "")

            # 구독 생성
            sub = BoostSubscription.objects.create(
                user=request.user,
                group=group,
                plan=plan,
                status="active",
                billing_key=billing_key,
                customer_key=customer_key,
                current_period_start=now,
                current_period_end=now + timezone.timedelta(days=30),
            )

            # 결제 내역 기록
            SubscriptionPayment.objects.create(
                subscription=sub,
                order_id=order_id,
                payment_key=payment_key,
                amount=cfg["amount"],
                status="success",
                toss_response=charge_data,
            )

            # 그룹 tier 업데이트
            group.tier = plan
            group.boost_count += 1
            group.save(update_fields=["tier", "boost_count"])

            serializer = BoostSubscriptionSerializer(sub)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        else:
            # 첫 결제 실패
            charge_data = charge_resp.json()
            return Response(
                {"detail": "첫 결제에 실패했습니다.", "toss_error": charge_data},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CancelSubscriptionView(APIView):
    """POST /api/payments/cancel/
    구독 취소 예약 (cancel_at_period_end=True).
    Body: { group_id }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        group_id = request.data.get("group_id")

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "그룹을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not _is_admin_or_owner(request.user, group):
            return Response(
                {"detail": "그룹 어드민 또는 오너만 구독을 관리할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            sub = BoostSubscription.objects.get(group=group, status="active")
        except BoostSubscription.DoesNotExist:
            return Response(
                {"detail": "활성 구독이 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        sub.cancel_at_period_end = True
        sub.save(update_fields=["cancel_at_period_end"])

        return Response({
            "message": "구독 취소가 예약되었습니다. 현재 구독 기간 종료 후 Starter로 변경됩니다.",
            "expires_at": sub.current_period_end,
        })


class SubscriptionDetailView(APIView):
    """GET /api/payments/subscription/?group={group_id}
    그룹의 현재 구독 정보 + 결제 내역 반환.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response(
                {"detail": "group 파라미터가 필요합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            group = Group.objects.get(pk=group_id)
        except Group.DoesNotExist:
            return Response(
                {"detail": "그룹을 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 멤버인지 확인
        if not GroupMember.objects.filter(group=group, user=request.user).exists() and group.owner != request.user:
            return Response(
                {"detail": "그룹 멤버만 구독 정보를 조회할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            sub = BoostSubscription.objects.prefetch_related("payments").get(group=group)
        except BoostSubscription.DoesNotExist:
            return Response(None)

        serializer = BoostSubscriptionSerializer(sub)
        return Response(serializer.data)
