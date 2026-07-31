from django.urls import path

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
]
