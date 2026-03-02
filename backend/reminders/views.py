from rest_framework import mixins, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EventReminder
from .serializers import EventReminderSerializer


class EventReminderViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EventReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EventReminder.objects.filter(user=self.request.user).select_related(
            "event"
        )
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Check the user has access to the event (is creator or event is shared)
        event = serializer.validated_data["event"]
        from events.models import EventShare
        from groups.models import GroupMember

        user = request.user
        is_creator = event.creator == user
        is_group_member = event.group and GroupMember.objects.filter(
            group=event.group, user=user
        ).exists()
        is_shared_to_user_group = EventShare.objects.filter(
            event=event,
            group__members__user=user,
        ).exists()

        if not (is_creator or is_group_member or is_shared_to_user_group):
            return Response(
                {"detail": "You do not have access to this event."},
                status=status.HTTP_403_FORBIDDEN,
            )

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
