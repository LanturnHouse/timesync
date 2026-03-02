from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Comment(TimeStampedModel):
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    content = models.TextField(max_length=2000)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.email} on {self.event.title}"
