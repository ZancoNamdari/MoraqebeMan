from django.urls import path

from .views import (
    ApproveCaregiverView,
    MyExperienceView,
    MyFullProfileView,
    MyReferencesView,
    MyServiceAreasView,
    MySkillsView,
    MyWorkPreferencesView,
    ServiceAreaDetailView,
)

urlpatterns = [
    path("caregivers/me/work-preferences/", MyWorkPreferencesView.as_view(), name="my-work-preferences"),
    path("caregivers/me/service-areas/", MyServiceAreasView.as_view(), name="my-service-areas"),
    path("caregivers/me/service-areas/<int:area_id>/", ServiceAreaDetailView.as_view(), name="service-area-detail"),
    path("caregivers/me/experience/", MyExperienceView.as_view(), name="my-experience"),
    path("caregivers/me/skills/", MySkillsView.as_view(), name="my-skills"),
    path("caregivers/me/references/", MyReferencesView.as_view(), name="my-references"),
    path("caregivers/me/full/", MyFullProfileView.as_view(), name="my-full-profile"),
    path("caregivers/<int:user_id>/approve/", ApproveCaregiverView.as_view(), name="approve-caregiver"),
]
