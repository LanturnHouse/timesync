import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("groups", "0002_groupinvitation"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BoostSubscription",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("plan", models.CharField(choices=[("lv1", "Level 1"), ("lv2", "Level 2"), ("lv3", "Level 3")], max_length=10)),
                ("status", models.CharField(
                    choices=[
                        ("active", "Active"),
                        ("past_due", "Past Due"),
                        ("expired", "Expired"),
                        ("cancelled", "Cancelled"),
                    ],
                    default="active",
                    max_length=10,
                )),
                ("billing_key", models.CharField(max_length=200)),
                ("customer_key", models.CharField(max_length=200)),
                ("current_period_start", models.DateTimeField()),
                ("current_period_end", models.DateTimeField()),
                ("cancel_at_period_end", models.BooleanField(default=False)),
                ("failed_attempts", models.IntegerField(default=0)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="boost_subscriptions",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("group", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="boost_subscription",
                    to="groups.group",
                )),
            ],
            options={"db_table": "boost_subscriptions"},
        ),
        migrations.CreateModel(
            name="SubscriptionPayment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("order_id", models.CharField(max_length=64, unique=True)),
                ("payment_key", models.CharField(blank=True, max_length=200)),
                ("amount", models.IntegerField()),
                ("status", models.CharField(
                    choices=[("success", "Success"), ("failed", "Failed")],
                    max_length=10,
                )),
                ("toss_response", models.JSONField(default=dict)),
                ("subscription", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="payments",
                    to="payments.boostsubscription",
                )),
            ],
            options={"db_table": "subscription_payments", "ordering": ["-created_at"]},
        ),
    ]
