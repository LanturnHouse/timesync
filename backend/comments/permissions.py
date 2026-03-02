from rest_framework import permissions


class IsCommentAuthor(permissions.BasePermission):
    """Allow update/delete only for the comment author."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user
