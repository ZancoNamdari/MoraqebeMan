from django.urls import path

from .supervisor_views import (
    SupervisorCaregiverDetailView,
    SupervisorCaregiverFullProfileView,
    SupervisorCaregiverListView,
    SupervisorCaregiverProgressView,
    SupervisorExperienceView,
    SupervisorIdentityView,
    SupervisorReferencesView,
    SupervisorServiceAreaDetailView,
    SupervisorServiceAreasView,
    SupervisorSkillsView,
    SupervisorCompatibilityQuestionnaireView,
    SupervisorWorkPreferencesView,
)
from .views import (
    ApproveCaregiverView,
    MyExperienceView,
    MyFullProfileView,
    MyIdentityProfileView,
    MyReferencesView,
    MyServiceAreasView,
    MySkillsView,
    MyWorkPreferencesView,
    RejectCaregiverView,
    ServiceAreaDetailView,
)

urlpatterns = [
    path("caregivers/me/identity/", MyIdentityProfileView.as_view(), name="my-identity-profile"),
    path("caregivers/me/work-preferences/", MyWorkPreferencesView.as_view(), name="my-work-preferences"),
    path("caregivers/me/service-areas/", MyServiceAreasView.as_view(), name="my-service-areas"),
    path("caregivers/me/service-areas/<int:area_id>/", ServiceAreaDetailView.as_view(), name="service-area-detail"),
    path("caregivers/me/experience/", MyExperienceView.as_view(), name="my-experience"),
    path("caregivers/me/skills/", MySkillsView.as_view(), name="my-skills"),
    path("caregivers/me/references/", MyReferencesView.as_view(), name="my-references"),
    path("caregivers/me/full/", MyFullProfileView.as_view(), name="my-full-profile"),
    path("caregivers/<int:user_id>/approve/", ApproveCaregiverView.as_view(), name="approve-caregiver"),
    path("caregivers/<int:user_id>/reject/", RejectCaregiverView.as_view(), name="reject-caregiver"),

    # Supervisor bulk-data-entry dashboard — separate namespace,
    # separate permission (IsAdminOrSuperuser, not IsCaregiver)
    path("supervisor/caregivers/", SupervisorCaregiverListView.as_view(), name="supervisor-caregiver-list"),
    path("supervisor/caregivers/<int:user_id>/", SupervisorCaregiverDetailView.as_view(), name="supervisor-caregiver-detail"),
    path("supervisor/caregivers/<int:user_id>/progress/", SupervisorCaregiverProgressView.as_view(), name="supervisor-caregiver-progress"),
    path("supervisor/caregivers/<int:user_id>/full/", SupervisorCaregiverFullProfileView.as_view(), name="supervisor-caregiver-full"),
    path("supervisor/caregivers/<int:user_id>/identity/", SupervisorIdentityView.as_view(), name="supervisor-identity"),
    path("supervisor/caregivers/<int:user_id>/work-preferences/", SupervisorWorkPreferencesView.as_view(), name="supervisor-work-preferences"),
    path("supervisor/caregivers/<int:user_id>/compatibility-questionnaire/", SupervisorCompatibilityQuestionnaireView.as_view(), name="supervisor-compatibility-questionnaire"),
    path("supervisor/caregivers/<int:user_id>/service-areas/", SupervisorServiceAreasView.as_view(), name="supervisor-service-areas"),
    path("supervisor/caregivers/<int:user_id>/service-areas/<int:area_id>/", SupervisorServiceAreaDetailView.as_view(), name="supervisor-service-area-detail"),
    path("supervisor/caregivers/<int:user_id>/experience/", SupervisorExperienceView.as_view(), name="supervisor-experience"),
    path("supervisor/caregivers/<int:user_id>/skills/", SupervisorSkillsView.as_view(), name="supervisor-skills"),
    path("supervisor/caregivers/<int:user_id>/references/", SupervisorReferencesView.as_view(), name="supervisor-references"),
]
