from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from events.models import Event
from notifications.utils import notify
from .models import Comment
from .permissions import IsCommentAuthor
from .serializers import CommentSerializer


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated, IsCommentAuthor]

    def get_queryset(self):
        event_id = self.kwargs.get("event_id")
        return (
            Comment.objects.filter(event_id=event_id)
            .select_related("author")
            .order_by("created_at")
        )

    def perform_create(self, serializer):
        event_id = self.kwargs.get("event_id")
        comment = serializer.save(author=self.request.user, event_id=event_id)

        # Notify event creator (skip if commenter is the creator)
        try:
            event = Event.objects.select_related("creator").get(id=event_id)
            notify(
                recipient=event.creator,
                verb="new_comment",
                message=f'{self.request.user.email} commented on "{event.title}"',
                actor=self.request.user,
                target_id=str(event_id),
            )
        except Event.DoesNotExist:
            pass
