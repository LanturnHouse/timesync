from django.contrib import admin

from .models import Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("event", "author", "content", "created_at")
    list_filter = ("event",)
    search_fields = ("content",)
