from django.db import migrations


def create_periodic_tasks(apps, schema_editor):
    IntervalSchedule = apps.get_model("django_celery_beat", "IntervalSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=1,
        period="days",
    )

    PeriodicTask.objects.get_or_create(
        name="Charge due subscriptions",
        defaults={
            "interval": schedule,
            "task": "payments.tasks.charge_due_subscriptions",
            "enabled": True,
        },
    )

    PeriodicTask.objects.get_or_create(
        name="Handle expired subscriptions",
        defaults={
            "interval": schedule,
            "task": "payments.tasks.handle_expired_subscriptions",
            "enabled": True,
        },
    )


def remove_periodic_tasks(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(
        name__in=["Charge due subscriptions", "Handle expired subscriptions"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
        ("django_celery_beat", "0019_alter_periodictasks_options"),
    ]

    operations = [
        migrations.RunPython(create_periodic_tasks, remove_periodic_tasks),
    ]
