from django.contrib import admin

from .models import Webhook, WebhookLog


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ("url", "group", "is_active", "created_at")
    list_filter = ("is_active", "group")


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ("webhook", "event_type", "success", "response_status", "created_at")
    list_filter = ("success", "event_type")
