from django.contrib import admin

from .models import Boost


@admin.register(Boost)
class BoostAdmin(admin.ModelAdmin):
    list_display = ("user", "group", "created_at")
    list_filter = ("group",)
