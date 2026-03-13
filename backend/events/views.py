import calendar as _calendar
from datetime import timedelta

from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserSettings
from groups.models import GroupMember
from notifications.utils import notify
from .filters import EventFilter
from .ical import build_calendar
from .models import Event, EventLog, EventRSVP, EventShare
from .permissions import IsEventOwnerOrGroupAdmin
from .serializers import (
    CalendarEventSerializer,
    EventRSVPSerializer,
    EventSerializer,
    EventShareSerializer,
)
from .utils import expand_recurring_event


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsAuthenticated, IsEventOwnerOrGroupAdmin]
    filterset_class = EventFilter
    search_fields = ["title", "description"]
    ordering_fields = ["start_at", "end_at", "created_at"]
    ordering = ["start_at"]

    def get_queryset(self):
        user = self.request.user

        # Groups the user belongs to
        user_group_ids = GroupMember.objects.filter(user=user).values_list(
            "group_id", flat=True
        )

        # Members who share all their events
        share_all_user_ids = GroupMember.objects.filter(
            group_id__in=user_group_ids, share_mode="all"
        ).exclude(user=user).values_list("user_id", flat=True)

        # Events explicitly shared to user's groups
        shared_event_ids = EventShare.objects.filter(
            group_id__in=user_group_ids
        ).values_list("event_id", flat=True)

        return (
            Event.objects.filter(
                models.Q(creator=user)  # Own events
                | models.Q(group_id__in=user_group_ids)  # Group events
                | models.Q(creator_id__in=share_all_user_ids)  # share_mode=all
                | models.Q(id__in=shared_event_ids)  # Explicitly shared
            )
            .distinct()
            .select_related("creator", "group")
        )

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        # Track changed fields before save
        changed_fields = [
            k for k, v in serializer.validated_data.items()
            if k not in ("recurrence_scope", "recurrence_id")
            and getattr(instance, k, None) != v
        ]
        serializer.save()
        if changed_fields:
            EventLog.objects.create(
                event=serializer.instance,
                actor=self.request.user,
                action=EventLog.ActionChoices.UPDATED,
                detail={"fields": changed_fields},
            )

    def _get_master_and_occurrence_dt(self, event_id: str):
        """
        Parse a virtual recurring event id (``master_id__iso_dt``) or a real id.
        Returns (master_event, occurrence_dt_or_None).
        """
        from django.utils.dateparse import parse_datetime
        from django.utils import timezone as tz
        if "__" in str(event_id):
            parts = str(event_id).split("__", 1)
            master = Event.objects.get(pk=parts[0])
            dt = parse_datetime(parts[1])
            if dt and tz.is_naive(dt):
                dt = tz.make_aware(dt)
            return master, dt
        return Event.objects.get(pk=event_id), None

    def update(self, request, *args, **kwargs):
        """
        If recurrence_scope is provided, apply scoped recurrence update logic.
        Scope values: 'this' | 'future' | 'all'
        Also accepts recurrence_id (ISO string) for this/future scopes.
        """
        scope = request.data.get("recurrence_scope")
        recurrence_id_str = request.data.get("recurrence_id")

        if not scope:
            return super().update(request, *args, **kwargs)

        from django.utils.dateparse import parse_datetime
        from django.utils import timezone as tz
        from dateutil.rrule import rrulestr

        event = self.get_object()
        # Resolve the master event for virtual occurrences
        master = event.parent_event if event.parent_event_id else event

        if scope == "all":
            # Modify the master directly
            serializer = self.get_serializer(master, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            # Don't overwrite recurrence_scope / recurrence_id fields
            data = {k: v for k, v in serializer.validated_data.items()
                    if k not in ("recurrence_scope", "recurrence_id", "parent_event")}
            changed_fields = [k for k in data if getattr(master, k, None) != data[k]]
            for attr, value in data.items():
                setattr(master, attr, value)
            master.save()
            if changed_fields:
                EventLog.objects.create(
                    event=master,
                    actor=request.user,
                    action=EventLog.ActionChoices.UPDATED,
                    detail={"fields": changed_fields},
                )
            return Response(EventSerializer(master, context={"request": request}).data)

        if not recurrence_id_str:
            return Response(
                {"detail": "recurrence_id is required for 'this'/'future' scope."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        occurrence_dt = parse_datetime(recurrence_id_str)
        if occurrence_dt and tz.is_naive(occurrence_dt):
            occurrence_dt = tz.make_aware(occurrence_dt)

        if scope == "this":
            # Create an exception instance that overrides only this occurrence
            data = {k: v for k, v in request.data.items()
                    if k not in ("recurrence_scope", "recurrence_id", "parent_event", "rrule")}
            # Build a concrete exception event
            exception = Event.objects.create(
                creator=master.creator,
                group=master.group,
                title=data.get("title", master.title),
                start_at=data.get("start_at", master.start_at),
                end_at=data.get("end_at", master.end_at),
                description=data.get("description", master.description),
                category=data.get("category", master.category),
                color=data.get("color", master.color),
                recurrence_id=occurrence_dt,
                parent_event=master,
            )
            return Response(
                EventSerializer(exception, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        if scope == "future":
            # Set UNTIL on the master's rrule at occurrence_dt - 1 second
            until_dt = occurrence_dt - tz.timedelta(seconds=1)
            try:
                rule = rrulestr(master.rrule, dtstart=master.start_at)
                # Rebuild as RFC5545 string with UNTIL
                until_str = until_dt.strftime("%Y%m%dT%H%M%SZ")
                rrule_str = master.rrule
                if "UNTIL=" in rrule_str:
                    import re
                    rrule_str = re.sub(r"UNTIL=[^;]+", f"UNTIL={until_str}", rrule_str)
                elif "COUNT=" in rrule_str:
                    rrule_str = re.sub(r"COUNT=[^;]+", f"UNTIL={until_str}", rrule_str)
                else:
                    rrule_str = rrule_str.rstrip(";") + f";UNTIL={until_str}"
                master.rrule = rrule_str
                master.save(update_fields=["rrule"])
            except Exception:
                pass

            # Create a new master starting from occurrence_dt onwards
            data = {k: v for k, v in request.data.items()
                    if k not in ("recurrence_scope", "recurrence_id", "parent_event")}
            new_master = Event.objects.create(
                creator=master.creator,
                group=master.group,
                title=data.get("title", master.title),
                start_at=data.get("start_at", occurrence_dt),
                end_at=data.get("end_at", master.end_at),
                description=data.get("description", master.description),
                category=data.get("category", master.category),
                color=data.get("color", master.color),
                rrule=data.get("rrule", master.rrule),
            )
            return Response(
                EventSerializer(new_master, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )

        return Response({"detail": "Invalid scope."}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Recurrence-aware delete with scope: 'this' | 'future' | 'all'."""
        scope = request.query_params.get("recurrence_scope") or request.data.get("recurrence_scope")
        recurrence_id_str = request.query_params.get("recurrence_id") or request.data.get("recurrence_id")

        if not scope:
            return super().destroy(request, *args, **kwargs)

        from django.utils.dateparse import parse_datetime
        from django.utils import timezone as tz
        import re

        event = self.get_object()
        master = event.parent_event if event.parent_event_id else event

        if scope == "all":
            master.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        if not recurrence_id_str:
            return Response(
                {"detail": "recurrence_id is required for 'this'/'future' scope."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        occurrence_dt = parse_datetime(recurrence_id_str)
        if occurrence_dt and tz.is_naive(occurrence_dt):
            occurrence_dt = tz.make_aware(occurrence_dt)

        if scope == "this":
            # Create a cancellation exception (tombstone marker)
            Event.objects.create(
                creator=master.creator,
                group=master.group,
                title=master.title,
                start_at=occurrence_dt,
                end_at=occurrence_dt + (master.end_at - master.start_at),
                recurrence_id=occurrence_dt,
                parent_event=master,
                is_tombstone=True,  # Separate tombstone flag, not is_template
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        if scope == "future":
            until_dt = occurrence_dt - tz.timedelta(seconds=1)
            until_str = until_dt.strftime("%Y%m%dT%H%M%SZ")
            rrule_str = master.rrule
            if "UNTIL=" in rrule_str:
                rrule_str = re.sub(r"UNTIL=[^;]+", f"UNTIL={until_str}", rrule_str)
            elif "COUNT=" in rrule_str:
                rrule_str = re.sub(r"COUNT=[^;]+", f"UNTIL={until_str}", rrule_str)
            else:
                rrule_str = rrule_str.rstrip(";") + f";UNTIL={until_str}"
            master.rrule = rrule_str
            master.save(update_fields=["rrule"])
            return Response(status=status.HTTP_204_NO_CONTENT)

        return Response({"detail": "Invalid scope."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def calendar(self, request):
        """Non-paginated endpoint for FullCalendar date range queries.
        Also expands recurring master events into virtual occurrences.

        Uses OVERLAP semantics: returns events whose time range intersects
        with [start_after, end_before), so overflow days in month view
        (e.g. March 30-31 visible in April) are correctly included.
        Accepts both full ISO datetime strings and date-only strings.
        """
        from django.utils.dateparse import parse_datetime, parse_date
        from datetime import datetime, time as dt_time

        queryset = self.get_queryset()

        # Apply non-date filters manually (category, search)
        category = request.query_params.get("category")
        search_q = request.query_params.get("search")
        if category:
            queryset = queryset.filter(category=category)
        if search_q:
            queryset = queryset.filter(
                models.Q(title__icontains=search_q)
                | models.Q(description__icontains=search_q)
            )

        # Exclude templates and tombstones from calendar view
        queryset = queryset.filter(is_template=False, is_tombstone=False)

        start_str = request.query_params.get("start_after", "")
        end_str = request.query_params.get("end_before", "")

        def parse_flexible(s: str):
            """Parse an ISO datetime or date-only string to an aware datetime."""
            dt = parse_datetime(s)
            if dt is not None:
                return dt if timezone.is_aware(dt) else timezone.make_aware(dt)
            d = parse_date(s)
            if d is not None:
                return timezone.make_aware(datetime.combine(d, dt_time.min))
            return None

        range_start = parse_flexible(start_str) if start_str else None
        range_end = parse_flexible(end_str) if end_str else None

        # Overlap filter: event overlaps the range iff
        #   event.start_at < range_end  AND  event.end_at > range_start
        if range_start:
            queryset = queryset.filter(end_at__gt=range_start)
        if range_end:
            queryset = queryset.filter(start_at__lt=range_end)

        # Separate non-recurring events from recurring masters
        regular = queryset.filter(rrule="", parent_event__isnull=True)
        recurring_masters = queryset.filter(rrule__gt="", parent_event__isnull=True)
        # Exception instances (child events, excluding tombstones)
        exception_instances = queryset.filter(parent_event__isnull=False)

        data = list(CalendarEventSerializer(regular, many=True).data)
        data += list(CalendarEventSerializer(exception_instances, many=True).data)

        for master in recurring_masters.prefetch_related("exceptions"):
            if start_str and end_str:
                try:
                    occurrences = expand_recurring_event(master, start_str, end_str)
                    data.extend(occurrences)
                except Exception:
                    # Fall back to serializing the master itself
                    data.append(CalendarEventSerializer(master).data)
            else:
                data.append(CalendarEventSerializer(master).data)

        return Response(data)

    @action(detail=False, methods=["get"], url_path="export-all.ics", url_name="export-all-ical")
    def export_all_ical(self, request):
        """Export all of the user's own events as an iCal file."""
        events = Event.objects.filter(
            creator=request.user, is_template=False
        ).order_by("start_at")
        cal = build_calendar(events, cal_name="My TimeSync Calendar")
        return HttpResponse(
            cal.to_ical(),
            content_type="text/calendar; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="my-calendar.ics"'},
        )

    @action(detail=True, methods=["get"], url_path="export.ics", url_name="export-ical")
    def export_ical(self, request, pk=None):
        """Export a single event as an iCal file."""
        event = self.get_object()
        cal = build_calendar([event], cal_name=event.title)
        return HttpResponse(
            cal.to_ical(),
            content_type="text/calendar; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{event.title}.ics"'
            },
        )

    @action(detail=False, methods=["get"])
    def conflicts(self, request):
        """
        Return events that overlap with the given time range (for conflict detection).
        Query params: start_at, end_at, exclude (event id to skip)
        """
        user = request.user
        start_at = request.query_params.get("start_at")
        end_at = request.query_params.get("end_at")
        exclude_id = request.query_params.get("exclude")

        if not start_at or not end_at:
            return Response(
                {"detail": "start_at and end_at are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get user settings (default: self conflicts only)
        try:
            user_settings = user.settings
        except UserSettings.DoesNotExist:
            user_settings = UserSettings(detect_self_conflicts=True, detect_group_conflicts=False)

        # Always check own events
        own_qs = Event.objects.filter(
            creator=user,
            is_template=False,
            start_at__lt=end_at,
            end_at__gt=start_at,
        )

        if exclude_id:
            own_qs = own_qs.exclude(id=exclude_id)

        conflicting = list(own_qs)

        # Optionally check group members' events
        if user_settings.detect_group_conflicts:
            user_group_ids = GroupMember.objects.filter(user=user).values_list(
                "group_id", flat=True
            )
            share_all_user_ids = GroupMember.objects.filter(
                group_id__in=user_group_ids, share_mode="all"
            ).exclude(user=user).values_list("user_id", flat=True)

            shared_event_ids = EventShare.objects.filter(
                group_id__in=user_group_ids
            ).values_list("event_id", flat=True)

            group_qs = Event.objects.filter(
                models.Q(creator_id__in=share_all_user_ids)
                | models.Q(id__in=shared_event_ids),
                is_template=False,
                start_at__lt=end_at,
                end_at__gt=start_at,
            ).select_related("creator")

            if exclude_id:
                group_qs = group_qs.exclude(id=exclude_id)

            conflicting += list(group_qs)

        serializer = CalendarEventSerializer(conflicting, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def templates(self, request):
        """List templates owned by the current user (excludes tombstones)."""
        queryset = Event.objects.filter(
            creator=request.user, is_template=True, is_tombstone=False
        ).select_related("creator", "group").order_by("-created_at")
        serializer = EventSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="save-as-template")
    def save_as_template(self, request, pk=None):
        """Clone an event as a template."""
        event = self.get_object()
        template = Event.objects.create(
            creator=request.user,
            group=event.group,
            title=f"{event.title} (Template)",
            start_at=event.start_at,
            end_at=event.end_at,
            description=event.description,
            category=event.category,
            color=event.color,
            is_template=True,
            bg_image_url=event.bg_image_url,
        )
        serializer = EventSerializer(template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="create-from-template")
    def create_from_template(self, request, pk=None):
        """Create a new event from a template, with optional overrides."""
        template = self.get_object()
        if not template.is_template:
            return Response(
                {"detail": "This event is not a template."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow overriding start_at and end_at
        start_at = request.data.get("start_at", template.start_at)
        end_at = request.data.get("end_at", template.end_at)

        event = Event.objects.create(
            creator=request.user,
            group=template.group,
            title=request.data.get("title", template.title.replace(" (Template)", "")),
            start_at=start_at,
            end_at=end_at,
            description=request.data.get("description", template.description),
            category=template.category,
            color=template.color,
            is_template=False,
            bg_image_url=template.bg_image_url,
        )
        serializer = EventSerializer(event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post", "delete"])
    def share(self, request, pk=None):
        """Share/unshare an event with a group."""
        event = self.get_object()

        if event.creator != request.user:
            return Response(
                {"detail": "Only the event creator can manage sharing."},
                status=status.HTTP_403_FORBIDDEN,
            )

        group_id = request.data.get("group_id")
        if not group_id:
            return Response(
                {"detail": "group_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify user is a member of the target group
        if not GroupMember.objects.filter(
            group_id=group_id, user=request.user
        ).exists():
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if request.method == "POST":
            share, created = EventShare.objects.get_or_create(
                event=event, group_id=group_id
            )
            if not created:
                return Response(
                    {"detail": "Event is already shared with this group."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Notify group members about the shared event
            member_users = GroupMember.objects.filter(
                group_id=group_id
            ).exclude(user=request.user).select_related("user")
            for member in member_users:
                notify(
                    recipient=member.user,
                    verb="event_shared",
                    message=f'{request.user.email} shared "{event.title}" with your group',
                    actor=request.user,
                    target_id=str(event.id),
                )

            serializer = EventShareSerializer(share)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        # DELETE
        deleted, _ = EventShare.objects.filter(
            event=event, group_id=group_id
        ).delete()
        if not deleted:
            return Response(
                {"detail": "Event is not shared with this group."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post", "delete"])
    def rsvp(self, request, pk=None):
        """POST: set/update RSVP status. DELETE: cancel RSVP."""
        event = self.get_object()

        if request.method == "DELETE":
            EventRSVP.objects.filter(event=event, user=request.user).delete()
            EventLog.objects.create(
                event=event,
                actor=request.user,
                action=EventLog.ActionChoices.RSVP_CHANGED,
                detail={"status": None},
            )
            return Response(status=status.HTTP_204_NO_CONTENT)

        # POST
        status_val = request.data.get("status")
        if status_val not in EventRSVP.StatusChoices.values:
            return Response(
                {"detail": f"status must be one of: {', '.join(EventRSVP.StatusChoices.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rsvp_obj, created = EventRSVP.objects.update_or_create(
            event=event,
            user=request.user,
            defaults={"status": status_val},
        )

        # Log the RSVP change
        EventLog.objects.create(
            event=event,
            actor=request.user,
            action=EventLog.ActionChoices.RSVP_CHANGED,
            detail={"status": status_val},
        )

        # Notify event creator (not if they RSVP their own event)
        if event.creator != request.user:
            notify(
                recipient=event.creator,
                verb="event_rsvp",
                message=f'{request.user.email} responded "{status_val}" to "{event.title}"',
                actor=request.user,
                target_id=str(event.id),
            )

        serializer = EventRSVPSerializer(rsvp_obj)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        """
        Change event confirmation status (confirmed / tentative).
        - Personal events: creator only
        - Group events: creator, admin, or editor
        """
        event = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Event.StatusChoices.values:
            return Response(
                {"detail": f"status must be one of: {', '.join(Event.StatusChoices.values)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Permission check
        is_creator = event.creator == request.user
        if not is_creator:
            if event.group_id:
                member = GroupMember.objects.filter(
                    group_id=event.group_id, user=request.user
                ).first()
                if not member or member.role not in ("admin", "editor"):
                    return Response(
                        {"detail": "Only admin or editor can change group event status."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                return Response(
                    {"detail": "Only the creator can change personal event status."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        old_status = event.status
        event.status = new_status
        event.save(update_fields=["status"])

        EventLog.objects.create(
            event=event,
            actor=request.user,
            action=EventLog.ActionChoices.STATUS_CHANGED,
            detail={"from": old_status, "to": new_status},
        )

        return Response(EventSerializer(event, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def logs(self, request, pk=None):
        """Return activity logs for an event."""
        event = self.get_object()
        from .serializers import EventLogSerializer
        qs = event.logs.select_related("actor").order_by("created_at")
        serializer = EventLogSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """사용자의 기간별 일정을 AI로 요약한다."""
        from django.conf import settings as django_settings

        try:
            from google import genai as google_genai
        except ImportError:
            return Response(
                {"detail": "AI 기능을 사용할 수 없습니다."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        api_key = getattr(django_settings, "GEMINI_API_KEY", "")
        if not api_key:
            return Response({"summary": "AI 기능이 설정되지 않았습니다."})

        period = request.query_params.get("period", "week")  # today | week | month
        now = timezone.now()

        if period == "today":
            start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
            label = "오늘"
        elif period == "month":
            start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            last_day = _calendar.monthrange(now.year, now.month)[1]
            end = now.replace(day=last_day, hour=23, minute=59, second=59, microsecond=999999)
            label = f"{now.month}월"
        else:  # week (default)
            weekday = now.weekday()  # Mon=0
            start = (now - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
            end = (start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=999999)
            label = "이번 주"

        # 해당 기간의 사용자 이벤트 조회
        events = Event.objects.filter(
            creator=request.user,
            start_at__gte=start,
            start_at__lte=end,
        ).order_by("start_at")

        if not events.exists():
            return Response({
                "summary": f"{label}에 등록된 일정이 없습니다.",
                "period": period,
                "event_count": 0,
            })

        # 프롬프트 구성
        lines = [f"[{label} 일정 목록]"]
        for ev in events:
            month = ev.start_at.month
            day = ev.start_at.day
            time_str = ev.start_at.strftime("%H:%M")
            lines.append(
                f"- {month}월 {day}일 {time_str} / {ev.title}"
                + (f" ({ev.category})" if ev.category else "")
            )

        prompt = (
            "아래는 사용자의 " + label + " 일정 목록입니다. "
            "이 일정들을 자연스럽고 친근한 한국어로 2~4문장으로 요약해 주세요. "
            "총 일정 수, 가장 바쁜 날, 주요 일정 등을 포함하면 좋습니다.\n\n"
            + "\n".join(lines)
        )

        try:
            client = google_genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
            )
            return Response({
                "summary": response.text,
                "period": period,
                "event_count": events.count(),
            })
        except Exception as exc:
            return Response(
                {"detail": f"AI 요약 생성에 실패했습니다: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def availability(self, request):
        """
        GET /events/availability/?group_id=&start=&end=
        Returns each group member's busy slots for the given period.
        """
        group_id = request.query_params.get("group_id")
        start = request.query_params.get("start")
        end = request.query_params.get("end")

        if not all([group_id, start, end]):
            return Response(
                {"detail": "group_id, start, and end are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify the requester is a member of the group
        if not GroupMember.objects.filter(
            group_id=group_id, user=request.user
        ).exists():
            return Response(
                {"detail": "You are not a member of this group."},
                status=status.HTTP_403_FORBIDDEN,
            )

        members = GroupMember.objects.filter(
            group_id=group_id
        ).select_related("user")

        result = {}
        for membership in members:
            member_user = membership.user
            busy_events = Event.objects.filter(
                creator=member_user,
                is_template=False,
                start_at__lt=end,
                end_at__gt=start,
            ).values("start_at", "end_at")

            result[str(member_user.id)] = {
                "user_email": member_user.email,
                "user_display_name": member_user.display_name or member_user.email,
                "busy": [
                    {
                        "start": e["start_at"].isoformat(),
                        "end": e["end_at"].isoformat(),
                    }
                    for e in busy_events
                ],
            }

        return Response(result)
