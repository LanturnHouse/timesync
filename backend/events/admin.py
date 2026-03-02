from django.contrib import admin

from .models import Event, EventShare


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "creator", "group", "start_at", "end_at", "color", "is_template")
    list_filter = ("is_template", "category")
    search_fields = ("title", "description")
    date_hierarchy = "start_at"


@admin.register(EventShare)
class EventShareAdmin(admin.ModelAdmin):
    list_display = ("event", "group", "created_at")
    list_filter = ("group",)
