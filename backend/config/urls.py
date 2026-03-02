from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/events/", include("events.urls")),
    path("api/groups/", include("groups.urls")),
    path("api/boosts/", include("boosts.urls")),
    path("api/polls/", include("voting.urls")),
    path("api/webhooks/", include("webhooks.urls")),
    path("api/notifications/", include("notifications.urls")),
    path("api/reminders/", include("reminders.urls")),
    path("api/payments/", include("payments.urls")),
]
