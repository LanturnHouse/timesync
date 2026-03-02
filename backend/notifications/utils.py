"""Utilities to create notifications and optionally broadcast via WebSocket + email."""

from django.conf import settings
from django.core.mail import send_mail

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification


def notify(recipient, verb: str, message: str, actor=None, target_id: str = "", send_email: bool = True):
    """
    Create a Notification, push a real-time badge update, and optionally send email.

    Args:
        recipient: User instance
        verb: one of Notification.VERB_CHOICES keys
        message: human-readable message
        actor: User who triggered the action (optional)
        target_id: related object id (e.g. event UUID string)
        send_email: whether to send an email notification
    """
    if recipient == actor:
        return  # Don't notify yourself

    notif = Notification.objects.create(
        recipient=recipient,
        actor=actor,
        verb=verb,
        message=message,
        target_id=target_id or "",
    )

    # Send email notification
    if send_email:
        try:
            send_mail(
                subject=f"TimeSync: {message}",
                message=(
                    f"{message}\n\n"
                    f"Visit TimeSync to view: {settings.FRONTEND_URL}\n\n"
                    "You can manage notification preferences in your Settings."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Never let email failure break the request

    # Broadcast unread count update via personal WebSocket channel
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    unread_count = Notification.objects.filter(
        recipient=recipient, is_read=False
    ).count()

    try:
        async_to_sync(channel_layer.group_send)(
            f"user_{recipient.id}",
            {
                "type": "notification.update",
                "data": {
                    "type": "notification.new",
                    "payload": {
                        "id": str(notif.id),
                        "verb": notif.verb,
                        "message": notif.message,
                        "unread_count": unread_count,
                    },
                },
            },
        )
    except Exception:
        pass  # WebSocket broadcast failure is non-critical
