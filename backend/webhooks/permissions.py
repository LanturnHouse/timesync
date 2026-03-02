from rest_framework import permissions


class IsWebhookCreator(permissions.BasePermission):
    """Allow update/delete only for the webhook creator."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.created_by == request.user
