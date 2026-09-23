from django.urls import path
from . import views

urlpatterns = [
    path('stats/',                          views.AdminStatsView.as_view()),

    path('clinics/',                         views.AdminClinicListView.as_view()),
    path('clinics/<int:pk>/',                views.AdminClinicDetailView.as_view()),
    path('clinics/<int:pk>/action/',         views.AdminClinicActionView.as_view()),

    path('services/',                        views.AdminServiceListCreateView.as_view()),
    path('services/<int:pk>/',               views.AdminServiceDetailView.as_view()),

    path('categories/',                      views.AdminCategoryListCreateView.as_view()),
    path('categories/<int:pk>/',             views.AdminCategoryDetailView.as_view()),

    path('service-categories/',              views.AdminServiceCategoryListCreateView.as_view()),
    path('service-categories/<int:pk>/',     views.AdminServiceCategoryDetailView.as_view()),

    path('users/',                           views.AdminUserListView.as_view()),
    path('users/<int:pk>/',                  views.AdminUserDetailView.as_view()),

    path('bookings/',                        views.AdminBookingListView.as_view()),
    path('bookings/<int:pk>/',               views.AdminBookingDetailView.as_view()),

    path('consultations/',                   views.AdminConsultationListView.as_view()),
    path('consultations/<int:pk>/',          views.AdminConsultationDetailView.as_view()),

    path('redemption-partners/',             views.AdminRedemptionPartnerListCreateView.as_view()),
    path('redemption-partners/<int:pk>/',    views.AdminRedemptionPartnerDetailView.as_view()),

    path('redemption-requests/',                    views.AdminRedemptionRequestListView.as_view()),
    path('redemption-requests/<int:pk>/',            views.AdminRedemptionRequestDetailView.as_view()),
    path('redemption-requests/<int:pk>/action/',     views.AdminRedemptionRequestActionView.as_view()),

    path('marketers/<int:marketer_id>/commission/', views.AdminMarketerCommissionView.as_view()),

    path('settings/', views.AdminPlatformSettingsView.as_view()),

    path('stores/',                views.AdminStoreListView.as_view()),
    path('stores/<int:pk>/',       views.AdminStoreDetailView.as_view()),
    path('stores/<int:pk>/action/', views.AdminStoreActionView.as_view()),

    path('portfolio/bulk-upload/', views.AdminBulkPortfolioUploadView.as_view()),

    path('doctors/',                views.AdminDoctorListView.as_view()),
    path('doctors/<int:pk>/',       views.AdminDoctorDetailView.as_view()),
    path('doctors/<int:pk>/action/', views.AdminDoctorActionView.as_view()),
]
