"""iCal generation utilities for TimeSync events."""

from icalendar import Calendar, Event as ICalEvent, vDatetime, vText
from django.utils import timezone as dj_timezone


def build_calendar(events, cal_name: str = "TimeSync") -> Calendar:
    """Build an iCalendar object from a queryset/list of Event instances."""
    cal = Calendar()
    cal.add("prodid", "-//TimeSync//timesync.app//EN")
    cal.add("version", "2.0")
    cal.add("calscale", "GREGORIAN")
    cal.add("x-wr-calname", vText(cal_name))
    cal.add("x-wr-timezone", vText("UTC"))

    for event in events:
        ical_event = ICalEvent()
        ical_event.add("uid", f"{event.id}@timesync.app")
        ical_event.add("summary", vText(event.title))
        ical_event.add("dtstart", vDatetime(event.start_at))
        ical_event.add("dtend", vDatetime(event.end_at))
        ical_event.add("dtstamp", vDatetime(dj_timezone.now()))

        if event.description:
            ical_event.add("description", vText(event.description))

        if event.category:
            ical_event.add("categories", vText(event.category))

        cal.add_component(ical_event)

    return cal
