from django.shortcuts import render, redirect
from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import Banner
from .serializers import BannerSerializer


class BannerListView(generics.ListAPIView):
    """لیست بنرهای تبلیغاتی فعال - برای نمایش در صفحه اصلی"""
    queryset           = Banner.objects.filter(is_active=True)
    serializer_class   = BannerSerializer
    permission_classes = [AllowAny]

def login_view(request):
    return render(request, 'login.html')

def index_view(request):
    return render(request, 'index.html')

def clinic_view(request):
    return render(request, 'clinic.html')

def bookings_view(request):
    return render(request, 'bookings.html')

def wallet_view(request):
    return render(request, 'wallet.html')

def profile_view(request):
    return render(request, 'profile.html')

def consult_view(request): 
     return render(request, 'consult.html')

def consultations_view(request):
    return render(request, 'consultations.html')

def vendor_view(request): 
    return render(request, 'vendor.html')

def redemption_view(request): 
    return render(request, 'redemption.html')

def explore_view(request): 
    return render(request, 'explore.html')

def vendor_register_view(request):  
    return render(request, 'vendor_register.html')

def vendor_dashboard_view(request): 
    return render(request, 'vendor_dashboard.html')

def marketer_register_view(request): 
    return render(request, 'marketer_register.html')

def advisors_view(request):
    return render(request, 'advisors.html')

def notifications_view(request):
    return render(request, 'notifications.html')

def support_view(request):
    return render(request, 'support.html')

def commission_requests_view(request):
    return render(request, 'commission_requests.html')

def terms_view(request):
    return render(request, 'terms.html')

def about_view(request):
    return render(request, 'about.html')

def marketer_dashboard_view(request):
    return render(request, 'marketer_dashboard.html')

def store_register_view(request):
    return render(request, 'store_register.html')

def store_dashboard_view(request):
    return render(request, 'store_dashboard.html')

def store_view(request):
    return render(request, 'store.html')

def orders_view(request):
    return render(request, 'orders.html')

def doctor_register_view(request):
    return render(request, 'doctor_register.html')

def doctor_dashboard_view(request):
    return render(request, 'doctor_dashboard.html')

def doctor_view(request):
    return render(request, 'doctor.html')

def doctor_appointments_view(request):
    return render(request, 'doctor_appointments.html')

def doctor_chat_view(request):
    return render(request, 'doctor_chat.html')


def admin_dashboard_view(request):
    return render(request, 'admin_dashboard.html')

def admin_clinics_view(request):
    return render(request, 'admin_clinics.html')

def admin_categories_view(request):
    return render(request, 'admin_categories.html')

def admin_users_view(request):
    return render(request, 'admin_users.html')

def admin_bookings_view(request):
    return render(request, 'admin_bookings.html')

def admin_stores_view(request):
    return render(request, 'admin_stores.html')

def admin_bulk_upload_view(request):
    return render(request, 'admin_bulk_upload.html')

def admin_doctors_view(request):
    return render(request, 'admin_doctors.html')

def admin_redemption_view(request):
    return render(request, 'admin_redemption.html')


