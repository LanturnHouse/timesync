from django.contrib import admin

from .models import BoostSubscription, SubscriptionPayment


class SubscriptionPaymentInline(admin.TabularInline):
    model = SubscriptionPayment
    extra = 0
    readonly_fields = ("order_id", "payment_key", "amount", "status", "created_at")
    can_delete = False


@admin.register(BoostSubscription)
class BoostSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "group", "user", "quantity", "status",
        "current_period_end", "cancel_at_period_end", "failed_attempts",
    )
    list_filter = ("status", "cancel_at_period_end")
    search_fields = ("group__name", "user__email")
    readonly_fields = (
        "billing_key", "customer_key",
        "current_period_start", "current_period_end",
        "created_at", "updated_at",
    )
    inlines = [SubscriptionPaymentInline]


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):
    list_display = ("order_id", "subscription", "amount", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("order_id", "subscription__group__name")
    readonly_fields = ("order_id", "payment_key", "toss_response", "created_at")
