from django.urls import path

from .views import (
    AcknowledgePatientNoteView,
    ComplaintDetailView,
    ComplaintListView,
    DismissComplaintView,
    MarkComplaintUnderReviewView,
    MyComplaintsView,
    MyPatientNotesView,
    PatientNoteDetailView,
    PatientNoteListView,
    ResolveComplaintView,
)

urlpatterns = [
    path("reviews/complaints/me/", MyComplaintsView.as_view(), name="my-complaints"),
    path("reviews/complaints/", ComplaintListView.as_view(), name="complaint-list"),
    path("reviews/complaints/<int:complaint_id>/", ComplaintDetailView.as_view(), name="complaint-detail"),
    path("reviews/complaints/<int:complaint_id>/under-review/", MarkComplaintUnderReviewView.as_view(), name="complaint-under-review"),
    path("reviews/complaints/<int:complaint_id>/resolve/", ResolveComplaintView.as_view(), name="complaint-resolve"),
    path("reviews/complaints/<int:complaint_id>/dismiss/", DismissComplaintView.as_view(), name="complaint-dismiss"),

    path("reviews/patient-notes/me/", MyPatientNotesView.as_view(), name="my-patient-notes"),
    path("reviews/patient-notes/", PatientNoteListView.as_view(), name="patient-note-list"),
    path("reviews/patient-notes/<int:note_id>/", PatientNoteDetailView.as_view(), name="patient-note-detail"),
    path("reviews/patient-notes/<int:note_id>/acknowledge/", AcknowledgePatientNoteView.as_view(), name="patient-note-acknowledge"),
]
