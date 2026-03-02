from rest_framework import permissions


class IsGroupAdmin(permissions.BasePermission):
    """Allow action only for group admins."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.members.filter(
            user=request.user, role="admin"
        ).exists()
