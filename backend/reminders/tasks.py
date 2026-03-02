from celery import shared_task
from django.utils import timezone


@shared_task
def send_pending_reminders():
    """
    Run every minute via celery-beat.
    Finds reminders whose event starts within `remind_before_minutes` from now
    (±1 minute window) and haven't been sent yet, then sends a notification.
    """
    from .models import EventReminder
    from notifications.utils import notify

    now = timezone.now()

    pending = EventReminder.objects.filter(is_sent=False).select_related(
        "event", "user"
    )

    sent_count = 0
    for reminder in pending:
        event = reminder.event
        # Calculate when the reminder should fire
        remind_at = event.start_at - timezone.timedelta(
            minutes=reminder.remind_before_minutes
        )

        # Fire within a ±1-minute window around remind_at
        window_start = remind_at - timezone.timedelta(minutes=1)
        window_end = remind_at + timezone.timedelta(minutes=1)

        if window_start <= now <= window_end:
            notify(
                recipient=reminder.user,
                verb="event_reminder",
                target=event,
                description=(
                    f"Reminder: '{event.title}' starts in "
                    f"{reminder.remind_before_minutes} minute(s)."
                ),
            )
            reminder.is_sent = True
            reminder.sent_at = now
            reminder.save(update_fields=["is_sent", "sent_at"])
            sent_count += 1

    return f"Sent {sent_count} reminder(s)"
