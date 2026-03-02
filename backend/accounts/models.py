import uuid
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import CustomUserManager


class User(AbstractUser):
    class PlanChoices(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"
        PRO_PLUS = "pro_plus", "Pro Plus"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Remove username, use email as primary identifier
    username = None
    email = models.EmailField("email address", max_length=255, unique=True)

    display_name = models.CharField(max_length=100, blank=True, default="")
    avatar_url = models.TextField(blank=True, null=True)
    plan = models.CharField(
        max_length=10,
        choices=PlanChoices.choices,
        default=PlanChoices.FREE,
    )
    timezone = models.CharField(max_length=50, default="UTC")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    class Meta:
        db_table = "users"

    def __str__(self):
        return self.email


class UserSettings(models.Model):
    """Per-user preference settings."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings",
        primary_key=True,
    )
    # Conflict detection
    detect_self_conflicts = models.BooleanField(
        default=True,
        help_text="Warn when a new event overlaps with the user's own events.",
    )
    detect_group_conflicts = models.BooleanField(
        default=False,
        help_text="Also check for overlaps with shared group members' events.",
    )

    class Meta:
        db_table = "user_settings"

    def __str__(self):
        return f"Settings for {self.user.email}"
