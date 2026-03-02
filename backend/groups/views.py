from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from events.ical import build_calendar
from events.models import Event
from .models import Group, GroupInvitation, GroupMember, generate_invite_code
from .serializers import (
    GroupInvitationSerializer,
    GroupMemberUpdateSerializer,
    GroupSerializer,
)


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Group.objects.filter(
            members__user=self.request.user
        ).prefetch_related("members__user")

    def perform_create(self, serializer):
        group = serializer.save(owner=self.request.user)
        GroupMember.objects.create(
            group=group, user=self.request.user, role="admin"
        )

    def destroy(self, request, *args, **kwargs):
        """Only the group owner can delete the group."""
        group = self.get_object()
        if group.owner != request.user:
            return Response(
                {"detail": "Only the group owner can delete this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    def _check_member_limit(self, group):
        """Return a 403 Response if the group is at its member limit, else None."""
        max_m = group.max_members
        if max_m is not None:
            current = GroupMember.objects.filter(group=group).count()
            if current >= max_m:
                return Response(
                    {
                        "detail": (
                            f"This group has reached its member limit ({max_m} members) "
                            f"for the '{group.tier}' tier. Boost the group to increase the limit."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        return None

    @action(detail=True, methods=["post"], url_path="join")
    def join(self, request, pk=None):
        group = self.get_object()
        if GroupMember.objects.filter(group=group, user=request.user).exists():
            return Response(
                {"detail": "Already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit_error = self._check_member_limit(group)
        if limit_error:
            return limit_error
        GroupMember.objects.create(group=group, user=request.user)
        return Response(
            {"detail": "Joined successfully."},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def invite(self, request, pk=None):
        """Send email invitation to join the group."""
        group = self.get_object()

        # Only admins can invite
        membership = GroupMember.objects.filter(
            group=group, user=request.user, role="admin"
        ).first()
        if not membership:
            return Response(
                {"detail": "Only admins can invite members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check member limit before proceeding with invitation
        limit_error = self._check_member_limit(group)
        if limit_error:
            return limit_error

        email = request.data.get("email")
        if not email:
            return Response(
                {"detail": "email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if already a member
        existing_user = User.objects.filter(email=email).first()
        if existing_user and GroupMember.objects.filter(
            group=group, user=existing_user
        ).exists():
            return Response(
                {"detail": "This user is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check for pending invitation
        if GroupInvitation.objects.filter(
            group=group, invitee_email=email, status="pending"
        ).exists():
            return Response(
                {"detail": "A pending invitation already exists for this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = GroupInvitation.objects.create(
            group=group,
            invited_by=request.user,
            invitee_email=email,
        )

        # Send email
        invite_url = f"{settings.FRONTEND_URL}/invite/{invitation.token}"
        send_mail(
            subject=f"You've been invited to join {group.name} on TimeSync",
            message=(
                f"{request.user.email} has invited you to join the group "
                f'"{group.name}" on TimeSync.\n\n'
                f"Click the link below to accept:\n{invite_url}"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )

        serializer = GroupInvitationSerializer(invitation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="regenerate-invite-code")
    def regenerate_invite_code(self, request, pk=None):
        """Regenerate the group's invite code."""
        group = self.get_object()

        if not GroupMember.objects.filter(
            group=group, user=request.user, role="admin"
        ).exists():
            return Response(
                {"detail": "Only admins can regenerate invite codes."},
                status=status.HTTP_403_FORBIDDEN,
            )

        group.invite_code = generate_invite_code()
        group.save(update_fields=["invite_code"])
        return Response({"invite_code": group.invite_code})

    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        """Leave the group."""
        group = self.get_object()
        membership = GroupMember.objects.filter(
            group=group, user=request.user
        ).first()

        if not membership:
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Owner can't leave (must transfer first or delete group)
        if group.owner == request.user:
            return Response(
                {"detail": "Group owner cannot leave. Transfer ownership or delete the group."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.delete()
        return Response({"detail": "Left the group successfully."})

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path="members/(?P<user_id>[^/.]+)",
    )
    def manage_member(self, request, pk=None, user_id=None):
        """Update member role/share_mode or remove a member."""
        group = self.get_object()

        # Only admins can manage members
        if not GroupMember.objects.filter(
            group=group, user=request.user, role="admin"
        ).exists():
            return Response(
                {"detail": "Only admins can manage members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = GroupMember.objects.filter(
            group=group, user_id=user_id
        ).first()
        if not membership:
            return Response(
                {"detail": "Member not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Can't manage the owner
        if membership.user == group.owner:
            return Response(
                {"detail": "Cannot modify the group owner."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.method == "DELETE":
            membership.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH
        serializer = GroupMemberUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if "role" in serializer.validated_data:
            membership.role = serializer.validated_data["role"]
        if "share_mode" in serializer.validated_data:
            membership.share_mode = serializer.validated_data["share_mode"]

        membership.save()
        return Response({
            "user": str(membership.user_id),
            "role": membership.role,
            "share_mode": membership.share_mode,
        })

    @action(detail=True, methods=["get"], url_path="calendar.ics", url_name="calendar-ical")
    def calendar_ics(self, request, pk=None):
        """Export all events shared with this group as iCal."""
        group = self.get_object()
        events = Event.objects.filter(
            shares__group=group,
            is_template=False,
        ).distinct()
        cal = build_calendar(events, cal_name=f"{group.name} — TimeSync")
        response = HttpResponse(
            cal.to_ical(),
            content_type="text/calendar; charset=utf-8",
        )
        response["Content-Disposition"] = (
            f'attachment; filename="group-{group.id}.ics"'
        )
        return response


class JoinByInviteCodeView(generics.GenericAPIView):
    """Join a group using an invite code."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        invite_code = request.data.get("invite_code")
        if not invite_code:
            return Response(
                {"detail": "invite_code is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        group = Group.objects.filter(invite_code=invite_code).first()
        if not group:
            return Response(
                {"detail": "Invalid invite code."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if GroupMember.objects.filter(group=group, user=request.user).exists():
            return Response(
                {"detail": "Already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_m = group.max_members
        if max_m is not None and GroupMember.objects.filter(group=group).count() >= max_m:
            return Response(
                {
                    "detail": (
                        f"This group has reached its member limit ({max_m} members) "
                        f"for the '{group.tier}' tier."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        GroupMember.objects.create(group=group, user=request.user)
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AcceptEmailInvitationView(generics.GenericAPIView):
    """Accept an email invitation by token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response(
                {"detail": "token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation = GroupInvitation.objects.filter(
            token=token, status="pending"
        ).select_related("group").first()

        if not invitation:
            return Response(
                {"detail": "Invalid or expired invitation."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Verify the email matches
        if invitation.invitee_email != request.user.email:
            return Response(
                {"detail": "This invitation was sent to a different email address."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if already a member
        if GroupMember.objects.filter(
            group=invitation.group, user=request.user
        ).exists():
            invitation.status = "accepted"
            invitation.save(update_fields=["status"])
            return Response(
                {"detail": "Already a member.", "group_id": str(invitation.group_id)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check member limit
        group = invitation.group
        max_m = group.max_members
        if max_m is not None and GroupMember.objects.filter(group=group).count() >= max_m:
            return Response(
                {
                    "detail": (
                        f"This group has reached its member limit ({max_m} members) "
                        f"for the '{group.tier}' tier."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        GroupMember.objects.create(group=invitation.group, user=request.user)
        invitation.status = "accepted"
        invitation.save(update_fields=["status"])

        return Response({
            "detail": "Invitation accepted.",
            "group_id": str(invitation.group_id),
        })


class InvitationDetailView(generics.RetrieveAPIView):
    """Get invitation details by token (public endpoint for invite page)."""
    permission_classes = [AllowAny]
    serializer_class = GroupInvitationSerializer
    lookup_field = "token"

    def get_queryset(self):
        return GroupInvitation.objects.filter(
            status="pending"
        ).select_related("group", "invited_by")
