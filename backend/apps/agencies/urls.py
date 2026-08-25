from django.urls import path

from .views import (
    AgencyCaregiverRequestDecisionView,
    AgencyCaregiverRequestsView,
    AgencyCaregiverRosterView,
    AgencyDashboardView,
    AgencyFamilyRequestDecisionView,
    AgencyFamilyRequestsView,
    AgencyFamilyRosterView,
    AgencyPatientListCreateView,
    AgencySuggestedCaregiversView,
    AgencySupervisorListCreateView,
    JoinAgencyAsCaregiverView,
    JoinAgencyAsFamilyView,
    MyAgencyProfileView,
    PlatformAnalyticsView,
)

urlpatterns = [
    # Agency-facing
    path("agencies/me/", MyAgencyProfileView.as_view(), name="agencies-me"),
    path("agencies/me/dashboard/", AgencyDashboardView.as_view(), name="agencies-dashboard"),
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

    # Agency-scoped patient creation — agency, its own supervisors, or
    # a superuser.
    path("agencies/<int:agency_id>/patients/", AgencyPatientListCreateView.as_view(), name="agencies-patients"),

    # Agency-scoped matching — candidates restricted to this agency's
    # own approved caregiver roster.
    path(
        "agencies/<int:agency_id>/patients/<int:patient_id>/suggest-caregivers/",
        AgencySuggestedCaregiversView.as_view(), name="agencies-suggest-caregivers",
    ),

    # Platform-wide analytics — SUPERUSER only, see PlatformAnalyticsView's
    # own docstring for why this isn't a fake "sees everything" agency.
    path("agencies/analytics/", PlatformAnalyticsView.as_view(), name="agencies-analytics"),
]
