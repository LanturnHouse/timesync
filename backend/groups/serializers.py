from rest_framework import serializers

from .models import Group, GroupInvitation, GroupMember


class GroupMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_display_name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = GroupMember
        fields = (
            "user", "user_email", "user_display_name",
            "role", "share_mode", "joined_at",
        )
        read_only_fields = ("user", "joined_at")


class GroupSerializer(serializers.ModelSerializer):
    members = GroupMemberSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(source="members.count", read_only=True)
    max_members = serializers.SerializerMethodField()
    webhook_limit = serializers.SerializerMethodField()
    poll_limit = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = (
            "id", "name", "owner", "boost_count", "tier", "max_members",
            "webhook_limit", "poll_limit",
            "banner_url", "bg_url", "invite_code",
            "members", "member_count", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "owner", "boost_count", "tier",
            "invite_code", "created_at", "updated_at",
        )

    def get_max_members(self, obj):
        return obj.max_members

    def get_webhook_limit(self, obj):
        return obj.webhook_limit

    def get_poll_limit(self, obj):
        return obj.poll_limit


class GroupMemberUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=GroupMember.RoleChoices.choices, required=False
    )
    share_mode = serializers.ChoiceField(
        choices=GroupMember.ShareModeChoices.choices, required=False
    )


class GroupInvitationSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)
    invited_by_email = serializers.EmailField(source="invited_by.email", read_only=True)

    class Meta:
        model = GroupInvitation
        fields = (
            "id", "group", "group_name", "invited_by", "invited_by_email",
            "invitee_email", "status", "token", "created_at",
        )
        read_only_fields = (
            "id", "group", "invited_by", "status", "token", "created_at",
        )
