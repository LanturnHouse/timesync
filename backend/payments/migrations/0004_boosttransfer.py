import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("groups", "0002_groupinvitation"),
        ("payments", "0003_boostsubscription_fk_quantity"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoostTransfer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("completed", "Completed"), ("cancelled", "Cancelled")],
                    default="pending",
                    max_length=10,
                )),
                ("apply_at", models.DateTimeField()),
                ("subscription", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="transfers",
                    to="payments.boostsubscription",
                )),
                ("target_group", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="incoming_transfers",
                    to="groups.group",
                )),
            ],
            options={
                "db_table": "boost_transfers",
                "ordering": ["-created_at"],
            },
        ),
    ]
