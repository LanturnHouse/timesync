from django.contrib import admin

from .models import EventReminder


@admin.register(EventReminder)
class EventReminderAdmin(admin.ModelAdmin):
    list_display = ("user", "event", "remind_before_minutes", "is_sent", "sent_at")
    list_filter = ("is_sent", "remind_before_minutes")
    search_fields = ("user__email", "event__title")
