from rest_framework import serializers

from .models import BoostSubscription, BoostTransfer, SubscriptionPayment


class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPayment
        fields = ("id", "order_id", "amount", "status", "created_at")
        read_only_fields = fields


class BoostTransferSerializer(serializers.ModelSerializer):
    source_group_name = serializers.CharField(source="subscription.group.name", read_only=True)
    target_group_name = serializers.CharField(source="target_group.name", read_only=True)
    target_group_id   = serializers.CharField(source="target_group.id", read_only=True)

    class Meta:
        model = BoostTransfer
        fields = (
            "id",
            "status",
            "apply_at",
            "source_group_name",
            "target_group_name",
            "target_group_id",
            "created_at",
        )
        read_only_fields = fields


class BoostSubscriptionSerializer(serializers.ModelSerializer):
    payments          = SubscriptionPaymentSerializer(many=True, read_only=True)
    user_email        = serializers.EmailField(source="user.email", read_only=True)
    user_display_name = serializers.CharField(source="user.display_name", read_only=True)
    amount            = serializers.IntegerField(read_only=True)  # property
    group_name        = serializers.CharField(source="group.name", read_only=True)
    pending_transfer  = serializers.SerializerMethodField()

    def get_pending_transfer(self, obj):
        transfer = obj.transfers.filter(status="pending").first()
        if transfer:
            return BoostTransferSerializer(transfer).data
        return None

    class Meta:
        model = BoostSubscription
        fields = (
            "id",
            "user",
            "user_email",
            "user_display_name",
            "group",
            "group_name",
            "quantity",
            "amount",
            "status",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "failed_attempts",
            "pending_transfer",
            "payments",
            "created_at",
        )
        read_only_fields = fields
