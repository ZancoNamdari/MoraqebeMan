from django.urls import path

from .views import ReminderPipelineOptionsView, ReminderRuleDetailView, ReminderRuleListCreateView

urlpatterns = [
    path(
        "agencies/<int:agency_id>/reminder-pipelines/",
        ReminderPipelineOptionsView.as_view(), name="reminder-pipelines",
    ),
    path(
        "agencies/<int:agency_id>/reminder-rules/",
        ReminderRuleListCreateView.as_view(), name="reminder-rules",
    ),
    path(
        "agencies/<int:agency_id>/reminder-rules/<int:rule_id>/",
        ReminderRuleDetailView.as_view(), name="reminder-rule-detail",
    ),
]
