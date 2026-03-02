import secrets

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from groups.models import Group, GroupMember

from .models import Webhook, WebhookLog
from .permissions import IsWebhookCreator
from .serializers import WebhookLogSerializer, WebhookSerializer


class WebhookViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated, IsWebhookCreator]

    def get_queryset(self):
        qs = Webhook.objects.select_related("group", "created_by")
        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        group_id = request.data.get("group")
        if group_id:
            try:
                group = Group.objects.get(pk=group_id)
                limit = group.webhook_limit
                if limit is not None:
                    current = Webhook.objects.filter(group=group).count()
                    if current >= limit:
                        return Response(
                            {
                                "detail": (
                                    f"웹훅은 최대 {limit}개까지 생성 가능합니다 "
                                    f"(현재 티어: {group.tier}). "
                                    "상위 플랜으로 업그레이드하세요."
                                )
                            },
                            status=status.HTTP_403_FORBIDDEN,
                        )
            except Group.DoesNotExist:
                pass
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Generate secret if not provided
        secret = serializer.validated_data.get("secret") or secrets.token_hex(32)
        serializer.save(created_by=self.request.user, secret=secret)

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        webhook = self.get_object()
        logs = webhook.logs.all()[:50]
        serializer = WebhookLogSerializer(logs, many=True)
        return Response(serializer.data)
