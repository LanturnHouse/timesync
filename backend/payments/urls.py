from django.urls import path

from .views import (
    CancelSubscriptionView,
    ConfirmBillingView,
    PlansView,
    PrepareBillingView,
    SubscriptionDetailView,
)

urlpatterns = [
    path("plans/",            PlansView.as_view(),            name="payment-plans"),
    path("prepare-billing/",  PrepareBillingView.as_view(),   name="payment-prepare-billing"),
    path("confirm-billing/",  ConfirmBillingView.as_view(),   name="payment-confirm-billing"),
    path("cancel/",           CancelSubscriptionView.as_view(), name="payment-cancel"),
    path("subscription/",     SubscriptionDetailView.as_view(), name="payment-subscription"),
]
