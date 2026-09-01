from django.urls import path

from .views import AuditLogListView, MyAuditHistoryView, PatientAuditHistoryView

urlpatterns = [
    path("audit/logs/", AuditLogListView.as_view(), name="audit-log-list"),
    path("audit/logs/me/", MyAuditHistoryView.as_view(), name="audit-log-me"),
    path("audit/logs/patient/<int:patient_id>/", PatientAuditHistoryView.as_view(), name="audit-log-patient-history"),
]
