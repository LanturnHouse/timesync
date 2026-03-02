import django_filters

from .models import Event


class EventFilter(django_filters.FilterSet):
    start_after = django_filters.IsoDateTimeFilter(
        field_name="start_at", lookup_expr="gte"
    )
    start_before = django_filters.IsoDateTimeFilter(
        field_name="start_at", lookup_expr="lte"
    )
    end_after = django_filters.IsoDateTimeFilter(
        field_name="end_at", lookup_expr="gte"
    )
    end_before = django_filters.IsoDateTimeFilter(
        field_name="end_at", lookup_expr="lte"
    )
    group = django_filters.UUIDFilter(field_name="group_id")
    category = django_filters.CharFilter(field_name="category", lookup_expr="exact")

    class Meta:
        model = Event
        fields = []
