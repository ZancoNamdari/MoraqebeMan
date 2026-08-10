from django.urls import path

from .views import (
    MyAssignedPatientsView,
    MyCareLogEntriesView,
    PatientCareTeamView,
    PatientCareTimelineView,
    SupervisorAssignmentsView,
    SupervisorEndAssignmentView,
)

urlpatterns = [
    # Supervisor-facing
    path("care/assignments/", SupervisorAssignmentsView.as_view(), name="care-assignments"),
    path("care/assignments/<int:assignment_id>/end/", SupervisorEndAssignmentView.as_view(), name="care-assignment-end"),

    # Caregiver-facing
    path("care/me/patients/", MyAssignedPatientsView.as_view(), name="care-my-patients"),
    path("care/me/log-entries/", MyCareLogEntriesView.as_view(), name="care-my-log-entries"),

    # Family/patient-facing
    path("care/patients/<int:patient_id>/team/", PatientCareTeamView.as_view(), name="care-patient-team"),
    path("care/patients/<int:patient_id>/timeline/", PatientCareTimelineView.as_view(), name="care-patient-timeline"),
]
