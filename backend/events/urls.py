from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EventViewSet

router = DefaultRouter()
router.register("", EventViewSet, basename="event")

urlpatterns = [
    path("<uuid:event_id>/comments/", include("comments.urls")),
    path("", include(router.urls)),
]
