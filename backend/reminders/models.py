from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class EventReminder(TimeStampedModel):
    MINUTES_CHOICES = [
        (5, "5 minutes before"),
        (10, "10 minutes before"),
        (15, "15 minutes before"),
        (30, "30 minutes before"),
        (60, "1 hour before"),
        (120, "2 hours before"),
        (1440, "1 day before"),
    ]

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reminders",
    )
    remind_before_minutes = models.PositiveIntegerField(choices=MINUTES_CHOICES)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "event_reminders"
        unique_together = [("event", "user", "remind_before_minutes")]

    def __str__(self):
        return f"{self.user.email} — {self.event.title} ({self.remind_before_minutes}min)"
