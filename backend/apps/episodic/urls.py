from django.urls import path

from .views import EpisodicCaregiverRosterView, EpisodicServiceListCreateView, EpisodicServiceStageUpdateView

urlpatterns = [
    path(
        "agencies/<int:agency_id>/episodic-caregiver-roster/",
        EpisodicCaregiverRosterView.as_view(), name="episodic-caregiver-roster",
    ),
    path("agencies/<int:agency_id>/episodic-services/", EpisodicServiceListCreateView.as_view(), name="episodic-services"),
    path(
        "agencies/<int:agency_id>/episodic-services/<int:service_id>/",
        EpisodicServiceStageUpdateView.as_view(), name="episodic-service-update",
    ),
]
