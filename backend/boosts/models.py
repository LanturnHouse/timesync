from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Boost(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="boosts",
    )
    group = models.ForeignKey(
        "groups.Group",
        on_delete=models.CASCADE,
        related_name="boosts",
    )

    class Meta:
        db_table = "boosts"

    def __str__(self):
        return f"{self.user.email} boosted {self.group.name}"
