"""Notification model for in-app notifications."""

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Notification(TimeStampedModel):
    VERB_CHOICES = [
        ("event_shared", "Event shared with your group"),
        ("new_comment", "New comment on your event"),
        ("event_rsvp", "RSVP response on your event"),
        ("event_reminder", "Event reminder"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    verb = models.CharField(max_length=50, choices=VERB_CHOICES)
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    # Optional deep-link target (e.g. event UUID)
    target_id = models.CharField(max_length=100, blank=True, default="")

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
