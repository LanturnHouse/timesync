from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BoostViewSet

router = DefaultRouter()
router.register("", BoostViewSet, basename="boost")

urlpatterns = [
    path("", include(router.urls)),
]
