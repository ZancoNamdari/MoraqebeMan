from django.urls import path

from .views import PageViewStatsView, PlatformCountsView, RecordPageViewView

urlpatterns = [
    path("analytics/pageview/", RecordPageViewView.as_view(), name="analytics-record-pageview"),
    path("analytics/pageviews/", PageViewStatsView.as_view(), name="analytics-pageview-stats"),
    path("analytics/platform-counts/", PlatformCountsView.as_view(), name="analytics-platform-counts"),
]
