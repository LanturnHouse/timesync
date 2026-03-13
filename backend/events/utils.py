"""Utility functions for recurring event expansion."""
from datetime import timedelta

from dateutil.rrule import rrulestr
from django.utils import timezone


def expand_recurring_event(event, start: str, end: str) -> list[dict]:
    """
    Expand a recurring master event into virtual occurrences within [start, end].

    Returns a list of dicts representing FullCalendar-compatible event instances,
    each with a virtual id of ``{master_id}__{dt.isoformat()}``.

    Exception instances (child events whose recurrence_id matches an occurrence)
    replace that occurrence in the output.
    """
    if not event.rrule:
        return []

    try:
        rule = rrulestr(event.rrule, dtstart=event.start_at)
    except Exception:
        return []

    range_start = _parse_dt(start)
    range_end = _parse_dt(end)

    # Collect recurrence_ids of exception instances so we can skip them
    exception_ids = set(
        event.exceptions.filter(
            recurrence_id__isnull=False
        ).values_list("recurrence_id", flat=True)
    )

    duration = event.end_at - event.start_at
    occurrences = []

    for dt in rule.between(range_start, range_end, inc=True):
        # Skip if there's an exception instance that overrides this occurrence
        if dt in exception_ids:
            continue

        virtual_id = f"{event.id}__{dt.isoformat()}"
        occurrences.append({
            "id": virtual_id,
            "title": event.title,
            "start_at": dt.isoformat(),
            "end_at": (dt + duration).isoformat(),
            "color": event.color,
            "category": event.category,
            "creator": str(event.creator_id),
            "creator_email": event.creator.email,
            "group": str(event.group_id) if event.group_id else None,
            "group_name": event.group.name if event.group else None,
            "description": event.description,
            "is_template": False,
            "is_tombstone": False,
            "status": event.status,
            "reminder_minutes": event.reminder_minutes,
            "rrule": event.rrule,
            "recurrence_id": dt.isoformat(),
            "parent_id": str(event.id),
        })

    return occurrences


def _parse_dt(dt_str: str):
    """Parse an ISO datetime or date-only string to a timezone-aware datetime."""
    from datetime import datetime, time as dt_time
    from django.utils.dateparse import parse_datetime, parse_date
    dt = parse_datetime(dt_str)
    if dt is not None:
        return dt if timezone.is_aware(dt) else timezone.make_aware(dt)
    # Fallback: date-only string (e.g. "2026-03-30" from FullCalendar date-only format)
    d = parse_date(dt_str)
    if d is not None:
        return timezone.make_aware(datetime.combine(d, dt_time.min))
    return None
