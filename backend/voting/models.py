from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Poll(TimeStampedModel):
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="polls",
    )
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="polls",
        blank=True,
        null=True,
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_polls",
    )
    question = models.CharField(max_length=500)
    is_multiple_choice = models.BooleanField(default=False)
    closes_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "polls"
        ordering = ["-created_at"]

    def __str__(self):
        return self.question


class PollOption(TimeStampedModel):
    poll = models.ForeignKey(
        Poll,
        on_delete=models.CASCADE,
        related_name="options",
    )
    text = models.CharField(max_length=200)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = "poll_options"
        ordering = ["order"]

    def __str__(self):
        return self.text


class Vote(models.Model):
    option = models.ForeignKey(
        PollOption,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="votes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "votes"
        unique_together = [("option", "user")]

    def __str__(self):
        return f"{self.user.email} voted for {self.option.text}"
