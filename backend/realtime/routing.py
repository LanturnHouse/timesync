from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/groups/(?P<group_id>[0-9a-f-]+)/$",
        consumers.GroupConsumer.as_asgi(),
    ),
    re_path(
        r"ws/notifications/$",
        consumers.NotificationConsumer.as_asgi(),
    ),
]
