from django.urls import path
from . import views

urlpatterns = [
    path('doctors/',                  views.DoctorListView.as_view()),
    path('doctors/<int:pk>/',         views.DoctorDetailView.as_view()),
    path('doctors/<int:pk>/reviews/', views.DoctorReviewListView.as_view()),
    path('doctor/register/',          views.DoctorRegisterView.as_view()),

    path('doctor/profile/',           views.MyDoctorProfileView.as_view()),
    path('doctor/tariffs/',           views.MyDoctorTariffsView.as_view()),
    path('doctor/tariffs/<int:pk>/',  views.MyDoctorTariffDetailView.as_view()),
    path('doctor/posts/',             views.MyDoctorPostsView.as_view()),
    path('doctor/posts/<int:pk>/',    views.MyDoctorPostDetailView.as_view()),
    path('doctor/availability/',          views.MyDoctorAvailabilityView.as_view()),
    path('doctor/availability/<int:pk>/', views.MyDoctorAvailabilityDetailView.as_view()),

    path('doctor/appointments/',                 views.MyDoctorAppointmentsView.as_view()),
    path('doctor/appointments/<int:pk>/action/',  views.DoctorAppointmentActionView.as_view()),
    path('doctor/appointments/<int:pk>/complete/', views.DoctorAppointmentCompleteView.as_view()),
    path('doctor/appointments/<int:pk>/reschedule-respond/', views.DoctorRescheduleRespondView.as_view()),

    path('doctor-appointments/',                 views.CreateDoctorAppointmentView.as_view()),
    path('doctor-appointments/mine/',             views.MyAppointmentsView.as_view()),
    path('doctor-appointments/<int:pk>/cancel/',  views.CancelAppointmentView.as_view()),
    path('doctor-appointments/<int:pk>/reschedule/', views.RequestRescheduleView.as_view()),

    path('doctor-chat/start/',                    views.StartConversationView.as_view()),
    path('doctor-chat/mine/',                      views.MyPatientConversationsView.as_view()),
    path('doctor-chat/received/',                  views.MyDoctorConversationsView.as_view()),
    path('doctor-chat/<int:pk>/send/',             views.SendMessageView.as_view()),
    path('doctor-chat/<int:pk>/read/',              views.MarkMessagesReadView.as_view()),

    path('doctor-reviews/',                       views.CreateDoctorReviewView.as_view()),
]
