from django.urls import path

from .views import (
    ConnectToPatientView,
    MyFamilyProfileView,
    MyPatientAccessRequestDecisionView,
    MyPatientAccessRequestsView,
    MyPatientFamilyLinksView,
    MyPatientInviteFamilyView,
    MyPatientProfileView,
    MyPatientsView,
    PatientAccessRequestDecisionView,
    PatientAccessRequestsView,
    PatientDetailView,
    PatientFamilyLinkDetailView,
    PatientFamilyLinksView,
    PatientQuestionnaireView,
)

urlpatterns = [
    path("families/me/", MyFamilyProfileView.as_view(), name="my-family-profile"),

    # Family-facing
    path("patients/", MyPatientsView.as_view(), name="my-patients"),
    path("patients/connect/", ConnectToPatientView.as_view(), name="connect-to-patient"),
    path("patients/<int:patient_id>/", PatientDetailView.as_view(), name="patient-detail"),
    path("patients/<int:patient_id>/questionnaire/", PatientQuestionnaireView.as_view(), name="patient-questionnaire"),
    path("patients/<int:patient_id>/family-links/", PatientFamilyLinksView.as_view(), name="patient-family-links"),
    path("patients/<int:patient_id>/family-links/<int:link_id>/", PatientFamilyLinkDetailView.as_view(), name="patient-family-link-detail"),
    path("patients/<int:patient_id>/access-requests/", PatientAccessRequestsView.as_view(), name="patient-access-requests"),
    path(
        "patients/<int:patient_id>/access-requests/<int:link_id>/approve/",
        PatientAccessRequestDecisionView.as_view(), {"decision": "approve"}, name="patient-access-request-approve",
    ),
    path(
        "patients/<int:patient_id>/access-requests/<int:link_id>/reject/",
        PatientAccessRequestDecisionView.as_view(), {"decision": "reject"}, name="patient-access-request-reject",
    ),

    # Patient-facing — a PATIENT-role user managing their own record
    path("patients/me/", MyPatientProfileView.as_view(), name="my-patient-profile"),
    path("patients/me/family-links/", MyPatientFamilyLinksView.as_view(), name="my-patient-family-links"),
    path("patients/me/invite-family/", MyPatientInviteFamilyView.as_view(), name="my-patient-invite-family"),
    path("patients/me/access-requests/", MyPatientAccessRequestsView.as_view(), name="my-patient-access-requests"),
    path(
        "patients/me/access-requests/<int:link_id>/approve/",
        MyPatientAccessRequestDecisionView.as_view(), {"decision": "approve"}, name="my-patient-access-request-approve",
    ),
    path(
        "patients/me/access-requests/<int:link_id>/reject/",
        MyPatientAccessRequestDecisionView.as_view(), {"decision": "reject"}, name="my-patient-access-request-reject",
    ),
]
