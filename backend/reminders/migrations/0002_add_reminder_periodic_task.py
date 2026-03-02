from django.db import migrations


def create_periodic_task(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    # Create or get a "every 1 minute" schedule
    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=1,
        period="minutes",
    )

    # Create the periodic task if it doesn't exist
    PeriodicTask.objects.get_or_create(
        name="Send pending event reminders",
        defaults={
            "interval": schedule,
            "task": "reminders.tasks.send_pending_reminders",
            "enabled": True,
        },
    )


def remove_periodic_task(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name="Send pending event reminders"
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("reminders", "0001_initial"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(create_periodic_task, remove_periodic_task),
    ]
