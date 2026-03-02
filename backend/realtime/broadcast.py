"""Utility to broadcast real-time events to group channels."""

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def broadcast_to_group(group_id: str, event_type: str, payload: dict):
    """
    Send a real-time event to all WebSocket connections in a group.

    Args:
        group_id: UUID of the group
        event_type: Type of event (e.g., "event.created", "comment.new")
        payload: Data to send to clients
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f"group_{group_id}",
        {
            "type": "group.event",
            "data": {
                "type": event_type,
                "payload": payload,
            },
        },
    )
