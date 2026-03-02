from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AcceptEmailInvitationView,
    GroupViewSet,
    InvitationDetailView,
    JoinByInviteCodeView,
)

router = DefaultRouter()
router.register("", GroupViewSet, basename="group")

urlpatterns = [
    path("join/", JoinByInviteCodeView.as_view(), name="join-by-invite-code"),
    path(
        "invitations/accept/",
        AcceptEmailInvitationView.as_view(),
        name="accept-invitation",
    ),
    path(
        "invitations/<str:token>/",
        InvitationDetailView.as_view(),
        name="invitation-detail",
    ),
    path("", include(router.urls)),
]
