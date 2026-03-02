from django.db.models import Count, Exists, OuterRef
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from groups.models import Group, GroupMember

from .models import Poll, PollOption, Vote
from .permissions import IsPollCreator
from .serializers import PollOptionSerializer, PollSerializer, VoteSerializer


class PollOptionAnnotatedSerializer(drf_serializers.ModelSerializer):
    """Lightweight serializer for options with annotated vote_count/voted_by_me."""

    vote_count = drf_serializers.IntegerField(read_only=True)
    voted_by_me = drf_serializers.BooleanField(read_only=True)

    class Meta:
        model = PollOption
        fields = ("id", "text", "order", "vote_count", "voted_by_me")


class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsAuthenticated, IsPollCreator]

    def get_queryset(self):
        qs = Poll.objects.select_related("creator", "group", "event")
        qs = qs.annotate(
            total_votes=Count("options__votes", distinct=True),
        )

        group_id = self.request.query_params.get("group")
        if group_id:
            qs = qs.filter(group_id=group_id)

        return qs.order_by("-created_at")

    def _annotate_options(self, poll):
        """Return options with vote_count and voted_by_me annotations."""
        user = self.request.user
        return poll.options.annotate(
            vote_count=Count("votes"),
            voted_by_me=Exists(
                Vote.objects.filter(option=OuterRef("pk"), user=user)
            ),
        ).order_by("order")

    def _serialize_poll(self, poll):
        """Serialize a single poll with annotated options."""
        serializer = self.get_serializer(poll)
        data = serializer.data
        options = self._annotate_options(poll)
        data["options"] = PollOptionAnnotatedSerializer(options, many=True).data
        return data

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return Response(self._serialize_poll(instance))

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        polls = page if page is not None else queryset

        data = [self._serialize_poll(poll) for poll in polls]

        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    def perform_create(self, serializer):
        group_id = self.request.data.get("group")
        if group_id:
            if not GroupMember.objects.filter(
                group_id=group_id, user=self.request.user
            ).exists():
                raise PermissionDenied("You are not a member of this group.")
            try:
                group = Group.objects.get(pk=group_id)
                limit = group.poll_limit
                if limit is not None:
                    current = Poll.objects.filter(group=group).count()
                    if current >= limit:
                        raise PermissionDenied(
                            f"스타터 티어는 최대 {limit}개의 투표만 생성 가능합니다. "
                            "상위 플랜으로 업그레이드하세요."
                        )
            except Group.DoesNotExist:
                pass
        serializer.save(creator=self.request.user)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()

        # Check if poll is closed
        if poll.closes_at and poll.closes_at <= timezone.now():
            return Response(
                {"detail": "This poll is closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        option_id = serializer.validated_data["option_id"]

        # Verify option belongs to this poll
        try:
            option = poll.options.get(id=option_id)
        except PollOption.DoesNotExist:
            return Response(
                {"detail": "Option does not belong to this poll."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # If not multiple choice, remove existing votes first
        if not poll.is_multiple_choice:
            Vote.objects.filter(option__poll=poll, user=request.user).delete()

        # Create vote
        _, created = Vote.objects.get_or_create(option=option, user=request.user)
        if not created and poll.is_multiple_choice:
            return Response(
                {"detail": "Already voted for this option."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Vote recorded."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def unvote(self, request, pk=None):
        poll = self.get_object()
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        option_id = serializer.validated_data["option_id"]

        deleted, _ = Vote.objects.filter(
            option_id=option_id, option__poll=poll, user=request.user
        ).delete()

        if not deleted:
            return Response(
                {"detail": "No vote found to remove."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"detail": "Vote removed."}, status=status.HTTP_200_OK)
