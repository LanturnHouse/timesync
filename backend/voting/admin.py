from django.contrib import admin

from .models import Poll, PollOption, Vote


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ("question", "group", "creator", "is_multiple_choice", "closes_at", "created_at")
    list_filter = ("is_multiple_choice", "group")
    inlines = [PollOptionInline]


@admin.register(PollOption)
class PollOptionAdmin(admin.ModelAdmin):
    list_display = ("text", "poll", "order")


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("option", "user", "created_at")
