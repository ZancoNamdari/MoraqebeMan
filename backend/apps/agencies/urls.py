from django.urls import path

from apps.caregivers.public_views import CaregiverFamilyViewPreviewView

from .views import (
    AgencyAnalyticsView,
    AgencyCandidateHistoryView,
    AgencyCaregiverRequestDecisionView,
    AgencyCaregiverRegistrationDecisionView,
    AgencyCaregiverRegistrationsView,
    AgencyCaregiverRequestsView,
    AgencyCandidateTrackingView,
    AgencyCaregiverRosterView,
    AgencyComplaintsAboutOwnRosterView,
    AgencyDashboardInsightsView,
    AgencyDashboardView,
    AgencyStaffDashboardView,
    AgencyFamilyRequestDecisionView,
    AgencyFamilyRequestsView,
    AgencyFamilyRosterView,
    AgencyAdminDetailView,
    AgencyAdminListCreateView,
    AgencyCaregiverDocumentUploadView,
    AgencyCaregiverPipelineListView,
    AgencyCaregiverPipelineUpdateView,
    AgencyPatientDetailView,
    AgencyPatientDocumentUploadView,
    AgencyPatientListCreateView,
    AgencyPatientPipelineStatusView,
    AgencyPatientQuestionnaireView,
    AgencyPipelineStageListCreateView,
    AgencySuggestedCaregiversView,
    AgencySuggestedPatientsView,
    AgencySupervisorDetailView,
    AgencySupervisorListCreateView,
    JoinAgencyAsCaregiverView,
    JoinAgencyAsFamilyView,
    MyAgencyProfileView,
    PlatformAgencyListCreateView,
    PlatformAnalyticsView,
)

urlpatterns = [
    # Platform-wide agency management — SUPERUSER only. Placed first,
    # and deliberately a bare root path (no /me/, no id) — it has to
    # come before nothing else could collide with it since Django
    # matches literal segments exactly, but keeping the "list all /
    # onboard a new one" action visually first in this file too.
    path("agencies/", PlatformAgencyListCreateView.as_view(), name="agencies-list-create"),

    # Agency-facing
    path("agencies/me/", MyAgencyProfileView.as_view(), name="agencies-me"),
    path("agencies/me/dashboard/", AgencyDashboardView.as_view(), name="agencies-dashboard"),
    path("agencies/me/dashboard/insights/", AgencyDashboardInsightsView.as_view(), name="agencies-dashboard-insights"),
    path("agencies/me/dashboard/staff/", AgencyStaffDashboardView.as_view(), name="agencies-dashboard-staff"),
    path("agencies/me/analytics/", AgencyAnalyticsView.as_view(), name="agencies-my-analytics"),
    path("agencies/me/families/", AgencyFamilyRosterView.as_view(), name="agencies-family-roster"),
    path("agencies/me/families/requests/", AgencyFamilyRequestsView.as_view(), name="agencies-family-requests"),
    path(
        "agencies/me/families/requests/<int:link_id>/approve/",
        AgencyFamilyRequestDecisionView.as_view(), {"decision": "approve"}, name="agencies-family-request-approve",
    ),
    path(
        "agencies/me/families/requests/<int:link_id>/reject/",
        AgencyFamilyRequestDecisionView.as_view(), {"decision": "reject"}, name="agencies-family-request-reject",
    ),
    path("agencies/me/caregivers/", AgencyCaregiverRosterView.as_view(), name="agencies-caregiver-roster"),
    path("agencies/me/candidates/", AgencyCandidateTrackingView.as_view(), name="agencies-candidate-tracking"),
    path("agencies/me/caregivers/registrations/", AgencyCaregiverRegistrationsView.as_view(), name="agencies-caregiver-registrations"),
    path("agencies/me/caregivers/registrations/<int:user_id>/<str:decision>/", AgencyCaregiverRegistrationDecisionView.as_view(), name="agencies-caregiver-registration-decision"),
    path("agencies/me/caregivers/requests/", AgencyCaregiverRequestsView.as_view(), name="agencies-caregiver-requests"),
    path(
        "agencies/me/caregivers/requests/<int:link_id>/approve/",
        AgencyCaregiverRequestDecisionView.as_view(), {"decision": "approve"}, name="agencies-caregiver-request-approve",
    ),
    path(
        "agencies/me/caregivers/requests/<int:link_id>/reject/",
        AgencyCaregiverRequestDecisionView.as_view(), {"decision": "reject"}, name="agencies-caregiver-request-reject",
    ),

    # Family/caregiver-facing (joining an agency)
    path("agencies/join/family/", JoinAgencyAsFamilyView.as_view(), name="agencies-join-family"),
    path("agencies/join/caregiver/", JoinAgencyAsCaregiverView.as_view(), name="agencies-join-caregiver"),

    # Agency supervisors — addressed by explicit agency id (not /me/)
    # since a superuser needs to create a supervisor for an agency
    # that isn't their own.
    path("agencies/<int:agency_id>/supervisors/", AgencySupervisorListCreateView.as_view(), name="agencies-supervisors"),
    path(
        "agencies/<int:agency_id>/supervisors/<int:supervisor_id>/",
        AgencySupervisorDetailView.as_view(), name="agencies-supervisor-detail",
    ),
    path("agencies/<int:agency_id>/admins/", AgencyAdminListCreateView.as_view(), name="agencies-admins"),
    path(
        "agencies/<int:agency_id>/admins/<int:admin_id>/",
        AgencyAdminDetailView.as_view(), name="agencies-admin-detail",
    ),

    # Agency-scoped patient creation — agency, its own supervisors, or
    # a superuser.
    path("agencies/<int:agency_id>/patients/", AgencyPatientListCreateView.as_view(), name="agencies-patients"),
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/",
        AgencyPatientDetailView.as_view(), name="agencies-patient-detail",
    ),
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/pipeline-status/",
        AgencyPatientPipelineStatusView.as_view(), name="agencies-patient-pipeline-status",
    ),
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/questionnaire/",
        AgencyPatientQuestionnaireView.as_view(), name="agencies-patient-questionnaire",
    ),
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/documents/<str:document_type>/",
        AgencyPatientDocumentUploadView.as_view(), name="agencies-patient-document-upload",
    ),
    path(
        "agencies/<int:agency_id>/caregivers/<int:user_id>/family-view/",
        CaregiverFamilyViewPreviewView.as_view(), name="agency-caregiver-family-view",
    ),
    path(
        "agencies/<int:agency_id>/caregivers-pipeline/",
        AgencyCaregiverPipelineListView.as_view(), name="agencies-caregivers-pipeline",
    ),
    path(
        "agencies/<int:agency_id>/caregivers-pipeline/<int:caregiver_id>/",
        AgencyCaregiverPipelineUpdateView.as_view(), name="agencies-caregivers-pipeline-update",
    ),
    path(
        "agencies/<int:agency_id>/caregivers-pipeline/<int:caregiver_id>/documents/<str:document_type>/",
        AgencyCaregiverDocumentUploadView.as_view(), name="agencies-caregivers-pipeline-document-upload",
    ),
    path(
        "agencies/<int:agency_id>/pipeline-stages/<str:pipeline_type>/",
        AgencyPipelineStageListCreateView.as_view(), name="agencies-pipeline-stages",
    ),

    # Agency-scoped matching — candidates restricted to this agency's
    # own approved caregiver roster.
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/suggest-caregivers/",
        AgencySuggestedCaregiversView.as_view(), name="agencies-suggest-caregivers",
    ),

    # Reverse direction — "find this caregiver a suitable patient",
    # for the caregiver Kanban card's own matching action.
    path(
        "agencies/<int:agency_id>/caregivers-pipeline/<int:caregiver_id>/suggest-patients/",
        AgencySuggestedPatientsView.as_view(), name="agencies-suggest-patients",
    ),

    # Read-only visibility into complaints about this agency's own
    # roster — no resolve/dismiss action, that stays platform-wide
    # staff-only.
    path("agencies/<int:agency_id>/complaints/", AgencyComplaintsAboutOwnRosterView.as_view(), name="agencies-own-complaints"),

    # Per-candidate edit/action history — agency-scoped read of
    # apps.audit.AuditLog, see AgencyCandidateHistoryView's own
    # docstring.
    path(
        "agencies/<int:agency_id>/candidates/<int:user_id>/history/",
        AgencyCandidateHistoryView.as_view(), name="agencies-candidate-history",
    ),

    # Platform-wide analytics — SUPERUSER only, see PlatformAnalyticsView's
    # own docstring for why this isn't a fake "sees everything" agency.
    path("agencies/analytics/", PlatformAnalyticsView.as_view(), name="agencies-analytics"),
]
