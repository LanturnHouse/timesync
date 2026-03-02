from django.utils import timezone
from rest_framework import serializers

from .models import Poll, PollOption, Vote


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.IntegerField(read_only=True, default=0)
    voted_by_me = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = PollOption
        fields = ("id", "text", "order", "vote_count", "voted_by_me")
        read_only_fields = ("id",)


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, required=True)
    creator_email = serializers.EmailField(source="creator.email", read_only=True)
    creator_display_name = serializers.CharField(
        source="creator.display_name", read_only=True
    )
    total_votes = serializers.IntegerField(read_only=True, default=0)
    is_closed = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = (
            "id",
            "group",
            "event",
            "creator",
            "creator_email",
            "creator_display_name",
            "question",
            "is_multiple_choice",
            "closes_at",
            "is_closed",
            "options",
            "total_votes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "creator", "created_at", "updated_at")

    def get_is_closed(self, obj):
        if obj.closes_at and obj.closes_at <= timezone.now():
            return True
        return False

    def create(self, validated_data):
        options_data = validated_data.pop("options", [])
        poll = Poll.objects.create(**validated_data)
        for idx, option_data in enumerate(options_data):
            PollOption.objects.create(
                poll=poll, text=option_data["text"], order=option_data.get("order", idx)
            )
        return poll

    def update(self, instance, validated_data):
        # Do not allow updating options via PATCH; only question / closes_at / is_multiple_choice
        validated_data.pop("options", None)
        return super().update(instance, validated_data)


class VoteSerializer(serializers.Serializer):
    option_id = serializers.UUIDField()

    def validate_option_id(self, value):
        try:
            PollOption.objects.get(id=value)
        except PollOption.DoesNotExist:
            raise serializers.ValidationError("Invalid option.")
        return value
