from django.urls import path

from .views import (
    MyFamilyProfileView,
    MyPatientsView,
    PatientDetailView,
    PatientFamilyLinkDetailView,
    PatientFamilyLinksView,
    PatientQuestionnaireView,
)

urlpatterns = [
    path("families/me/", MyFamilyProfileView.as_view(), name="my-family-profile"),
    path("patients/", MyPatientsView.as_view(), name="my-patients"),
    path("patients/<int:patient_id>/", PatientDetailView.as_view(), name="patient-detail"),
    path("patients/<int:patient_id>/questionnaire/", PatientQuestionnaireView.as_view(), name="patient-questionnaire"),
    path("patients/<int:patient_id>/family-links/", PatientFamilyLinksView.as_view(), name="patient-family-links"),
    path("patients/<int:patient_id>/family-links/<int:link_id>/", PatientFamilyLinkDetailView.as_view(), name="patient-family-link-detail"),
]
