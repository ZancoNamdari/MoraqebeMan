from django.urls import path
from . import views

urlpatterns = [
    path('categories/',              views.CategoryListView.as_view()),
    path('categories/<int:pk>/service-options/', views.CategoryServiceOptionsView.as_view()),
    path('service-options/all/',     views.AllServiceOptionsView.as_view()),
    path('clinics/',                 views.ClinicListView.as_view()),
    path('clinics/<int:pk>/',        views.ClinicDetailView.as_view()),
    path('clinics/create/',          views.ClinicCreateView.as_view()),
    path('clinics/mine/',            views.MyClinicView.as_view()),
    path('clinics/<int:pk>/services/', views.ClinicServicesView.as_view()),
    path('clinics/<int:pk>/portfolio/', views.ClinicPortfolioView.as_view()),
    path('clinics/<int:pk>/educational-videos/', views.ClinicEducationalVideosView.as_view()), 
    path('explore/', views.ExploreFeedView.as_view()),
    path('vendor/profile/',          views.MyClinicProfileView.as_view()),
    path('vendor/clinics/add/',      views.AddClinicView.as_view()),
    path('vendor/services/add/',     views.AddServiceView.as_view()),
    path('vendor/services/bulk-add/', views.AddServicesBulkView.as_view()),
    path('vendor/portfolio/add/',    views.AddPortfolioView.as_view()),
]