from django.contrib import admin

from .models import Group, GroupInvitation, GroupMember


class GroupMemberInline(admin.TabularInline):
    model = GroupMember
    extra = 0


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "boost_count", "tier", "created_at")
    list_filter = ("tier",)
    search_fields = ("name",)
    inlines = [GroupMemberInline]


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ("group", "user", "role", "share_mode", "joined_at")
    list_filter = ("role", "share_mode")


@admin.register(GroupInvitation)
class GroupInvitationAdmin(admin.ModelAdmin):
    list_display = ("group", "invitee_email", "invited_by", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("invitee_email",)
