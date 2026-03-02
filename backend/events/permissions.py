from rest_framework import permissions


class IsEventOwnerOrGroupAdmin(permissions.BasePermission):
    """Allow update/delete only for event creator or group admin."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if obj.creator == request.user:
            return True
        if obj.group:
            return obj.group.members.filter(
                user=request.user, role="admin"
            ).exists()
        return False
