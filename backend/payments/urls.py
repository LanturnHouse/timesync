from django.urls import path

from .views import (
    CancelSubscriptionView,
    ConfirmBillingView,
    MySubscriptionsView,
    PlansView,
    PrepareBillingView,
    SubscriptionListView,
)

urlpatterns = [
    path("plans/",             PlansView.as_view(),              name="payment-plans"),
    path("prepare-billing/",   PrepareBillingView.as_view(),     name="payment-prepare-billing"),
    path("confirm-billing/",   ConfirmBillingView.as_view(),     name="payment-confirm-billing"),
    path("cancel/",            CancelSubscriptionView.as_view(), name="payment-cancel"),
    path("subscriptions/",     SubscriptionListView.as_view(),   name="payment-subscriptions"),
    path("my-subscriptions/",  MySubscriptionsView.as_view(),    name="payment-my-subscriptions"),
]
