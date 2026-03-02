from rest_framework import serializers

from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source="author.email", read_only=True)
    author_display_name = serializers.CharField(
        source="author.display_name", read_only=True
    )
    author_avatar_url = serializers.CharField(
        source="author.avatar_url", read_only=True, default=None
    )

    class Meta:
        model = Comment
        fields = (
            "id", "event", "author", "author_email",
            "author_display_name", "author_avatar_url",
            "content", "created_at", "updated_at",
        )
        read_only_fields = ("id", "author", "event", "created_at", "updated_at")
