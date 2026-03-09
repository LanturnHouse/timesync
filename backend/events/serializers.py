from rest_framework import serializers

from .models import Event, EventRSVP, EventShare


class EventRSVPSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_display_name = serializers.CharField(
        source="user.display_name", read_only=True
    )

    class Meta:
        model = EventRSVP
        fields = (
            "id", "event", "user", "user_email", "user_display_name",
            "status", "created_at",
        )
        read_only_fields = ("id", "event", "user", "created_at")


class EventSerializer(serializers.ModelSerializer):
    creator_email = serializers.EmailField(source="creator.email", read_only=True)
    creator_display_name = serializers.CharField(
        source="creator.display_name", read_only=True
    )
    group_name = serializers.CharField(source="group.name", read_only=True, default=None)
    shared_to_groups = serializers.SerializerMethodField()
    my_rsvp_status = serializers.SerializerMethodField()
    rsvp_counts = serializers.SerializerMethodField()
    rsvp_details = serializers.SerializerMethodField()
    parent_id = serializers.PrimaryKeyRelatedField(
        source="parent_event", read_only=True
    )

    class Meta:
        model = Event
        fields = (
            "id", "creator", "creator_email", "creator_display_name",
            "group", "group_name", "title", "start_at", "end_at",
            "description", "category", "color", "is_template",
            "bg_image_url", "shared_to_groups",
            "my_rsvp_status", "rsvp_counts", "rsvp_details",
            "rrule", "recurrence_id", "parent_id",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "creator", "created_at", "updated_at")

    def get_shared_to_groups(self, obj):
        return list(obj.shares.values_list("group_id", flat=True))

    def get_my_rsvp_status(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        rsvp = obj.rsvps.filter(user=request.user).first()
        return rsvp.status if rsvp else None

    def get_rsvp_counts(self, obj):
        return {
            "accepted": obj.rsvps.filter(status="accepted").count(),
            "declined": obj.rsvps.filter(status="declined").count(),
            "tentative": obj.rsvps.filter(status="tentative").count(),
        }

    def get_rsvp_details(self, obj):
        result = {"accepted": [], "tentative": [], "declined": []}
        for rsvp in obj.rsvps.select_related("user").all():
            result[rsvp.status].append({
                "id": str(rsvp.user.id),
                "display_name": rsvp.user.display_name or "",
                "email": rsvp.user.email,
                "avatar_url": rsvp.user.avatar_url,
            })
        return result


class CalendarEventSerializer(serializers.ModelSerializer):
    """Lightweight serializer for FullCalendar rendering."""
    creator_email = serializers.EmailField(source="creator.email", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default=None)
    parent_id = serializers.PrimaryKeyRelatedField(
        source="parent_event", read_only=True
    )

    class Meta:
        model = Event
        fields = (
            "id", "title", "start_at", "end_at", "color",
            "category", "creator", "creator_email",
            "group", "group_name", "description", "is_template",
            "rrule", "recurrence_id", "parent_id",
        )


class EventShareSerializer(serializers.ModelSerializer):
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = EventShare
        fields = ("id", "event", "group", "group_name", "created_at")
        read_only_fields = ("id", "event", "created_at")
