import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0002_add_celery_tasks"),
        ("groups", "0002_groupinvitation"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. plan 필드 제거
        migrations.RemoveField(model_name="boostsubscription", name="plan"),

        # 2. group OneToOneField → ForeignKey
        migrations.AlterField(
            model_name="boostsubscription",
            name="group",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="boost_subscriptions",
                to="groups.group",
            ),
        ),

        # 3. quantity 추가
        migrations.AddField(
            model_name="boostsubscription",
            name="quantity",
            field=models.PositiveIntegerField(default=1),
        ),
    ]
