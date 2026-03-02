from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Webhook(TimeStampedModel):
    class EventTypeChoices(models.TextChoices):
        EVENT_CREATED = "event.created", "Event Created"
        EVENT_UPDATED = "event.updated", "Event Updated"
        EVENT_DELETED = "event.deleted", "Event Deleted"

    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="webhooks",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_webhooks",
    )
    url = models.URLField(max_length=500)
    event_types = models.JSONField(
        default=list,
        help_text="List of event types to listen for",
    )
    is_active = models.BooleanField(default=True)
    secret = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        db_table = "webhooks"

    def __str__(self):
        return f"Webhook {self.url} for {self.group.name}"


class WebhookLog(TimeStampedModel):
    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.CASCADE,
        related_name="logs",
    )
    event_type = models.CharField(max_length=50)
    payload = models.JSONField()
    response_status = models.IntegerField(null=True)
    response_body = models.TextField(blank=True, default="")
    success = models.BooleanField(default=False)

    class Meta:
        db_table = "webhook_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} -> {self.webhook.url} ({'OK' if self.success else 'FAIL'})"
