"""WebSocket consumers for real-time group updates."""

import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from groups.models import GroupMember


class GroupConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for group-scoped real-time updates.

    Connect: ws://host/ws/groups/<group_id>/?token=<jwt>
    Receives broadcasts for: event changes, comments, polls, boosts
    """

    async def connect(self):
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"group_{self.group_id}"
        user = self.scope.get("user")

        if not user or user.is_anonymous:
            await self.close()
            return

        # Verify membership
        is_member = await self._check_membership(user.id, self.group_id)
        if not is_member:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name, self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )

    async def receive_json(self, content):
        # Client messages are not expected; we only broadcast from server side
        pass

    # ---------- Event handlers for channel_layer.group_send ----------

    async def group_event(self, event):
        """Forward a group event to the WebSocket client."""
        await self.send_json(event["data"])

    @database_sync_to_async
    def _check_membership(self, user_id, group_id):
        return GroupMember.objects.filter(
            user_id=user_id, group_id=group_id
        ).exists()


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Personal WebSocket channel for real-time notification badge updates.

    Connect: ws://host/ws/notifications/?token=<jwt>
    """

    async def connect(self):
        user = self.scope.get("user")
        if not user or user.is_anonymous:
            await self.close()
            return

        self.personal_group = f"user_{user.id}"
        await self.channel_layer.group_add(self.personal_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "personal_group"):
            await self.channel_layer.group_discard(
                self.personal_group, self.channel_name
            )

    async def receive_json(self, content):
        pass

    async def notification_update(self, event):
        """Forward notification update to the WebSocket client."""
        await self.send_json(event["data"])
