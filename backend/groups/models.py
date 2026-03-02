import secrets
import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


def generate_invite_code():
    return secrets.token_urlsafe(15)[:20]


def generate_invitation_token():
    return uuid.uuid4().hex


class Group(TimeStampedModel):
    class TierChoices(models.TextChoices):
        STARTER = "starter", "Starter"
        LV1 = "lv1", "Level 1"
        LV2 = "lv2", "Level 2"
        LV3 = "lv3", "Level 3"

    name = models.CharField(max_length=200)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_groups",
    )
    boost_count = models.IntegerField(default=0)
    tier = models.CharField(
        max_length=10,
        choices=TierChoices.choices,
        default=TierChoices.STARTER,
    )
    banner_url = models.TextField(blank=True, null=True)
    bg_url = models.TextField(blank=True, null=True)
    invite_code = models.CharField(
        max_length=20, unique=True, default=generate_invite_code
    )

    class Meta:
        db_table = "groups"

    def __str__(self):
        return self.name

    TIER_MAX_MEMBERS = {
        "starter": 10,
        "lv1": 25,
        "lv2": 50,
        "lv3": None,  # unlimited
    }

    TIER_WEBHOOK_LIMIT = {"starter": 0, "lv1": 2, "lv2": 5, "lv3": 15}
    TIER_POLL_LIMIT = {"starter": 3, "lv1": None, "lv2": None, "lv3": None}

    @property
    def max_members(self):
        return self.TIER_MAX_MEMBERS.get(self.tier)

    @property
    def webhook_limit(self):
        return self.TIER_WEBHOOK_LIMIT.get(self.tier)

    @property
    def poll_limit(self):
        return self.TIER_POLL_LIMIT.get(self.tier)

    @property
    def computed_tier(self):
        """구독 기반 tier 계산. 활성 구독이 없으면 starter."""
        try:
            sub = self.boost_subscription  # payments.BoostSubscription OneToOne
            if sub.status == "active":
                return sub.plan  # "lv1" | "lv2" | "lv3"
        except Exception:
            pass
        return self.TierChoices.STARTER


class GroupMember(models.Model):
    class RoleChoices(models.TextChoices):
        ADMIN = "admin", "Admin"
        EDITOR = "editor", "Editor"
        MEMBER = "member", "Member"

    class ShareModeChoices(models.TextChoices):
        ALL = "all", "All"
        SELECTIVE = "selective", "Selective"

    group = models.ForeignKey(
        Group, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="group_memberships",
    )
    role = models.CharField(
        max_length=10,
        choices=RoleChoices.choices,
        default=RoleChoices.MEMBER,
    )
    share_mode = models.CharField(
        max_length=10,
        choices=ShareModeChoices.choices,
        default=ShareModeChoices.ALL,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_members"
        unique_together = [("group", "user")]

    def __str__(self):
        return f"{self.user.email} in {self.group.name}"


class GroupInvitation(TimeStampedModel):
    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        EXPIRED = "expired", "Expired"

    group = models.ForeignKey(
        Group,
        on_delete=models.CASCADE,
        related_name="invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_invitations",
    )
    invitee_email = models.EmailField()
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        default=generate_invitation_token,
    )

    class Meta:
        db_table = "group_invitations"

    def __str__(self):
        return f"Invitation to {self.invitee_email} for {self.group.name}"
