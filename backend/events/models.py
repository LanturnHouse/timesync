from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Event(TimeStampedModel):
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="events",
    )
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="events",
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=300)
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, default="")
    color = models.CharField(max_length=7, blank=True, default="")
    is_template = models.BooleanField(default=False)
    bg_image_url = models.TextField(blank=True, null=True)

    # --- Recurring event fields ---
    # RFC 5545 RRULE string (e.g. "FREQ=WEEKLY;INTERVAL=1")
    rrule = models.TextField(blank=True, default="")
    # The original start time of this occurrence (set for exception instances)
    recurrence_id = models.DateTimeField(null=True, blank=True)
    # Points to the master event for exception instances
    parent_event = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="exceptions",
    )

    class Meta:
        db_table = "events"
        ordering = ["start_at"]

    def __str__(self):
        return self.title


class EventRSVP(TimeStampedModel):
    class StatusChoices(models.TextChoices):
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        TENTATIVE = "tentative", "Tentative"

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="rsvps",
    )
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
    )

    class Meta:
        db_table = "event_rsvps"
        unique_together = [("event", "user")]

    def __str__(self):
        return f"{self.user.email} → {self.event.title}: {self.status}"


class EventShare(models.Model):
    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="shares",
    )
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="shared_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_shares"
        unique_together = [("event", "group")]

    def __str__(self):
        return f"{self.event.title} -> {self.group.name}"
