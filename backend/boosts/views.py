from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from groups.models import GroupMember
from .models import Boost
from .serializers import BoostSerializer


class BoostViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BoostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Boost.objects.select_related("user", "group")
        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)
        return qs.order_by("-created_at")

    def create(self, request, *args, **kwargs):
        group_id = request.data.get("group")
        if not group_id:
            return Response(
                {"detail": "group is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify membership
        if not GroupMember.objects.filter(
            group_id=group_id, user=request.user
        ).exists():
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        boost = Boost.objects.create(user=request.user, group_id=group_id)

        # Update group boost_count and tier
        group = boost.group
        group.boost_count = group.boosts.count()
        group.tier = group.computed_tier
        group.save(update_fields=["boost_count", "tier"])

        serializer = self.get_serializer(boost)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
