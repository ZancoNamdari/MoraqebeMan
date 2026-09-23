from django.db.models import Count, Sum
from decimal import Decimal
from rest_framework import generics, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination

from accounts.models import User
from clinics.models import Clinic, Category, ServiceCategory, Service, Portfolio
from bookings.models import BookingRequest
from consultations.models import Consultation
from redemption.models import RedemptionPartner, RedemptionRequest
from redemption.utils import approve_redemption_request, RedemptionApprovalError
from payments.models import MarketerCommission
from stores.models import Store
from doctors.models import Doctor

from .serializers import (
    AdminClinicListSerializer, AdminClinicCreateSerializer, AdminClinicDetailSerializer,
    AdminCategorySerializer, AdminServiceCategorySerializer, AdminServiceSerializer,
    AdminUserSerializer, AdminUserCreateSerializer, AdminBookingSerializer, AdminConsultationSerializer,
    AdminRedemptionPartnerSerializer, AdminRedemptionRequestSerializer, AdminMarketerCommissionSerializer,
    AdminStoreListSerializer, AdminStoreDetailSerializer,
    AdminDoctorListSerializer, AdminDoctorDetailSerializer,
)


class AdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ══════════════════════════════════════
#  آمار کلی داشبورد
# ══════════════════════════════════════
class AdminStatsView(APIView):
    """آمار کلی برای صفحه اصلی پنل مدیریت"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        clinics_by_status = dict(
            Clinic.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        bookings_by_status = dict(
            BookingRequest.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        consultations_by_status = dict(
            Consultation.objects.values('status').annotate(count=Count('id')).values_list('status', 'count')
        )
        approved_redemptions = RedemptionRequest.objects.filter(status='approved')
        total_commission = approved_redemptions.aggregate(total=Sum('commission_amount'))['total'] or 0

        return Response({
            'clinics': {
                'total':    Clinic.objects.count(),
                'pending':  clinics_by_status.get('pending', 0),
                'active':   clinics_by_status.get('active', 0),
                'inactive': clinics_by_status.get('inactive', 0),
            },
            'bookings': {
                'total':     BookingRequest.objects.count(),
                'pending':   bookings_by_status.get('pending', 0),
                'confirmed': bookings_by_status.get('confirmed', 0),
                'completed': bookings_by_status.get('completed', 0),
            },
            'consultations': {
                'total':   Consultation.objects.count(),
                'pending': consultations_by_status.get('pending', 0),
            },
            'users': {
                'total':     User.objects.count(),
                'vendors':   User.objects.filter(is_vendor=True).count(),
                'marketers': User.objects.filter(is_marketer=True).count(),
                'customers': User.objects.filter(is_vendor=False, is_marketer=False, is_staff=False).count(),
            },
            'redemption': {
                'pending_requests':   RedemptionRequest.objects.filter(status='pending').count(),
                'approved_requests':  approved_redemptions.count(),
                'total_commission':   total_commission,
            },
        })


# ══════════════════════════════════════
#  مدیریت مطب‌ها (Create / Read / Update / Delete کامل)
# ══════════════════════════════════════
class AdminClinicListView(generics.ListCreateAPIView):
    """لیست همه مطب‌ها با هر وضعیتی + امکان ایجاد مطب جدید توسط ادمین"""
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'city', 'address', 'owner__phone_number']

    def get_serializer_class(self):
        return AdminClinicCreateSerializer if self.request.method == 'POST' else AdminClinicListSerializer

    def get_queryset(self):
        qs = Clinic.objects.select_related('owner', 'category').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        clinic = serializer.save()
        return Response(AdminClinicDetailSerializer(clinic).data, status=status.HTTP_201_CREATED)


class AdminClinicDetailView(generics.RetrieveUpdateDestroyAPIView):
    """جزئیات کامل یک مطب برای بازبینی/ویرایش/حذف توسط ادمین"""
    queryset           = Clinic.objects.select_related('owner', 'category')
    serializer_class   = AdminClinicDetailSerializer
    permission_classes = [IsAdminUser]


class AdminClinicActionView(APIView):
    """تأیید / رد / غیرفعال‌سازی یک مطب توسط ادمین.
    مطب ناقص (بدون شهر/آدرس) تأیید نمی‌شود و فلگ is_vendor صاحب مطب هم‌زمان با تأیید فعال می‌شود."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        clinic = Clinic.objects.filter(id=pk).first()
        if not clinic:
            return Response({'error': 'مطب پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['approve', 'reject', 'deactivate']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'approve':
            if not clinic.address or not clinic.city:
                return Response(
                    {'error': 'این مطب فاقد شهر یا آدرس است و قابل تأیید نیست - ابتدا اطلاعات را تکمیل کنید'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            clinic.status = 'active'
            clinic.save(update_fields=['status'])
            if clinic.owner and not clinic.owner.is_vendor:
                clinic.owner.is_vendor = True
                clinic.owner.save(update_fields=['is_vendor'])
            from accounts.notifications import notify
            notify(clinic.owner, 'مطب شما تأیید شد 🎉', f'{clinic.name} از این پس برای مشتریان نمایش داده می‌شود', type='clinic', link='/vendor-dashboard/')

        elif action in ('reject', 'deactivate'):
            clinic.status = 'inactive'
            clinic.save(update_fields=['status'])
            from accounts.notifications import notify
            notify(clinic.owner, 'وضعیت مطب شما تغییر کرد', f'{clinic.name} در حال حاضر غیرفعال است', type='clinic', link='/vendor-dashboard/')

        return Response(AdminClinicDetailSerializer(clinic).data)


# ══════════════════════════════════════
#  مدیریت سرویس‌های واقعی هر مطب (Create / Read / Update / Delete کامل)
# ══════════════════════════════════════
class AdminServiceListCreateView(generics.ListCreateAPIView):
    """لیست/ایجاد سرویس برای یک مطب مشخص (پارامتر clinic الزامی برای فیلتر، اختیاری برای ایجاد در بدنه درخواست)"""
    serializer_class   = AdminServiceSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = Service.objects.select_related('clinic').order_by('clinic', 'name')
        clinic_id = self.request.query_params.get('clinic')
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        return qs


class AdminServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Service.objects.all()
    serializer_class   = AdminServiceSerializer
    permission_classes = [IsAdminUser]


# ══════════════════════════════════════
#  مدیریت دسته‌بندی‌ها و سرویس‌های استاندارد (CRUD کامل)
# ══════════════════════════════════════
class AdminCategoryListCreateView(generics.ListCreateAPIView):
    """لیست/ایجاد نوع کسب‌وکار (Category) - مثلاً سالن بیوتی، کلینیک تخصصی پوست"""
    queryset           = Category.objects.all().order_by('name')
    serializer_class   = AdminCategorySerializer
    permission_classes = [IsAdminUser]


class AdminCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Category.objects.all()
    serializer_class   = AdminCategorySerializer
    permission_classes = [IsAdminUser]


class AdminServiceCategoryListCreateView(generics.ListCreateAPIView):
    """لیست/ایجاد سرویس استاندارد قابل انتخاب برای یک نوع کسب‌وکار مشخص"""
    serializer_class   = AdminServiceCategorySerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = ServiceCategory.objects.select_related('business_category').order_by('business_category', 'order', 'name')
        business_category = self.request.query_params.get('category')
        if business_category:
            qs = qs.filter(business_category_id=business_category)
        return qs


class AdminServiceCategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = ServiceCategory.objects.all()
    serializer_class   = AdminServiceCategorySerializer
    permission_classes = [IsAdminUser]


# ══════════════════════════════════════
#  مدیریت کاربران (Read / Update / Delete - ایجاد از طریق ثبت‌نام عادی انجام می‌شود)
# ══════════════════════════════════════
class AdminUserListView(generics.ListCreateAPIView):
    """لیست کاربران با امکان جست‌وجو/فیلتر بر اساس نقش + امکان ایجاد کاربر جدید توسط ادمین
    (عمدتاً برای افزودن ادمین‌های جدید به پنل مدیریت)"""
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['phone_number', 'full_name', 'email']

    def get_serializer_class(self):
        return AdminUserCreateSerializer if self.request.method == 'POST' else AdminUserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-created_at')
        role = self.request.query_params.get('role')
        if role == 'vendor':
            qs = qs.filter(is_vendor=True)
        elif role == 'marketer':
            qs = qs.filter(is_marketer=True)
        elif role == 'staff':
            qs = qs.filter(is_staff=True)
        elif role == 'customer':
            qs = qs.filter(is_vendor=False, is_marketer=False, is_staff=False)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """مشاهده، ویرایش نقش‌ها (is_vendor / is_marketer / is_staff / is_active) و حذف یک کاربر"""
    queryset           = User.objects.all()
    serializer_class   = AdminUserSerializer
    permission_classes = [IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.id == request.user.id:
            return Response({'error': 'نمی‌توانید حساب خودتان را حذف کنید'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


# ══════════════════════════════════════
#  مدیریت رزروها و درخواست‌های مشاوره (CRUD کامل)
# ══════════════════════════════════════
class AdminBookingListView(generics.ListAPIView):
    """همه رزروهای پلتفرم با هر وضعیتی و هر مطبی - برای نظارت کلی ادمین"""
    serializer_class   = AdminBookingSerializer
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = BookingRequest.objects.select_related('customer', 'clinic', 'service').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class AdminBookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """ویرایش وضعیت/تاریخ یک رزرو یا حذف کامل آن توسط ادمین.
    اگر ادمین وضعیت را به لغو/رد تغییر دهد یا رزرویی که پرداخت شده را حذف کند،
    مبلغ (به‌همراه کش‌بک/کمیسیون مرتبط) طبق همان منطق مشتری/مطب برگردانده می‌شود."""
    queryset           = BookingRequest.objects.select_related('customer', 'clinic', 'service')
    serializer_class   = AdminBookingSerializer
    permission_classes = [IsAdminUser]

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        booking = serializer.save()
        if booking.status in ('cancelled', 'rejected') and old_status not in ('cancelled', 'rejected'):
            from bookings.utils import refund_booking
            refund_booking(booking)

    def perform_destroy(self, instance):
        from bookings.utils import refund_booking
        refund_booking(instance)
        instance.delete()


class AdminConsultationListView(generics.ListAPIView):
    """همه درخواست‌های مشاوره پلتفرم - برای نظارت کلی ادمین"""
    serializer_class   = AdminConsultationSerializer
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = Consultation.objects.select_related('customer', 'clinic', 'service').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class AdminConsultationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """ویرایش وضعیت یک درخواست مشاوره یا حذف کامل آن توسط ادمین"""
    queryset           = Consultation.objects.select_related('customer', 'clinic', 'service')
    serializer_class   = AdminConsultationSerializer
    permission_classes = [IsAdminUser]


# ══════════════════════════════════════
#  مدیریت سرویس‌دهندگان خرج اعتبار و کارمزد (CRUD کامل + تأیید/رد درخواست‌ها)
# ══════════════════════════════════════
class AdminRedemptionPartnerListCreateView(generics.ListCreateAPIView):
    """لیست/ایجاد سرویس‌دهنده خرج اعتبار - شامل تنظیم کارمزد پلتفرم که از همین‌جا قابل تغییر است"""
    queryset           = RedemptionPartner.objects.all().order_by('order', 'name')
    serializer_class   = AdminRedemptionPartnerSerializer
    permission_classes = [IsAdminUser]


class AdminRedemptionPartnerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = RedemptionPartner.objects.all()
    serializer_class   = AdminRedemptionPartnerSerializer
    permission_classes = [IsAdminUser]


class AdminRedemptionRequestListView(generics.ListAPIView):
    """همه درخواست‌های خرج اعتبار پلتفرم"""
    serializer_class   = AdminRedemptionRequestSerializer
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination

    def get_queryset(self):
        qs = RedemptionRequest.objects.select_related('user', 'partner').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class AdminRedemptionRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    """مشاهده/ویرایش دستی/حذف یک درخواست خرج اعتبار.
    برای تأیید واقعی (کسر از کیف‌پول + محاسبه کارمزد) از AdminRedemptionRequestActionView استفاده شود."""
    queryset           = RedemptionRequest.objects.select_related('user', 'partner')
    serializer_class   = AdminRedemptionRequestSerializer
    permission_classes = [IsAdminUser]


class AdminRedemptionRequestActionView(APIView):
    """تأیید یک درخواست خرج اعتبار (کسر مبلغ از کیف‌پول کاربر + محاسبه خودکار کارمزد پلتفرم بر اساس
    تنظیمات فعلی همکار) یا رد آن. بدنه درخواست تأیید: {"action": "approve", "final_amount": 500000}"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        req = RedemptionRequest.objects.filter(id=pk).first()
        if not req:
            return Response({'error': 'درخواست پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if req.status != 'pending':
            return Response({'error': 'این درخواست قبلاً بررسی شده است'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in ['approve', 'reject']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        admin_note = request.data.get('admin_note', '')
        if admin_note:
            req.admin_note = admin_note

        if action == 'approve':
            final_amount = request.data.get('final_amount')
            try:
                approve_redemption_request(req, final_amount=final_amount)
            except RedemptionApprovalError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            from accounts.notifications import notify
            notify(req.user, f'درخواست خرج اعتبار شما تأیید شد', f'{req.partner.name} — {req.final_amount} تومان کسر شد', type='redemption', link='/redemption/')
        else:
            from django.utils import timezone
            req.status = 'rejected'
            req.resolved_at = timezone.now()
            req.save()
            from accounts.notifications import notify
            notify(req.user, 'درخواست خرج اعتبار شما رد شد', req.partner.name, type='redemption', link='/redemption/')

        return Response(AdminRedemptionRequestSerializer(req).data)


# ══════════════════════════════════════
#  نرخ کمیسیون بازاریاب‌ها (قابل تغییر توسط ادمین)
# ══════════════════════════════════════
class AdminMarketerCommissionView(APIView):
    """مشاهده/ویرایش نرخ کمیسیون یک بازاریاب مشخص. اگر تنظیماتی وجود نداشته باشد،
    با نرخ‌های پیش‌فرض ساخته می‌شود (تا هرگز بازاریابی بدون تنظیمات کمیسیون نماند)."""
    permission_classes = [IsAdminUser]

    def get(self, request, marketer_id):
        marketer = User.objects.filter(id=marketer_id, is_marketer=True).first()
        if not marketer:
            return Response({'error': 'بازاریاب پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        from payments.utils import get_platform_settings
        platform_settings = get_platform_settings()
        settings, _ = MarketerCommission.objects.get_or_create(marketer=marketer, defaults={
            'customer_commission_percent': platform_settings.default_marketer_customer_percent,
            'clinic_commission_percent': platform_settings.default_marketer_clinic_percent,
        })
        return Response(AdminMarketerCommissionSerializer(settings).data)

    def patch(self, request, marketer_id):
        marketer = User.objects.filter(id=marketer_id, is_marketer=True).first()
        if not marketer:
            return Response({'error': 'بازاریاب پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        from payments.utils import get_platform_settings
        platform_settings = get_platform_settings()
        settings, _ = MarketerCommission.objects.get_or_create(marketer=marketer, defaults={
            'customer_commission_percent': platform_settings.default_marketer_customer_percent,
            'clinic_commission_percent': platform_settings.default_marketer_clinic_percent,
        })
        serializer = AdminMarketerCommissionSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminPlatformSettingsView(APIView):
    """تنظیمات نرخ‌های کلی پلتفرم (کش‌بک، پاداش معرف، نرخ پیش‌فرض کمیسیون بازاریاب) -
    قابل مشاهده و تغییر توسط ادمین، بدون نیاز به تغییر کد یا دیپلوی مجدد."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from payments.utils import get_platform_settings
        s = get_platform_settings()
        return Response({
            'cashback_percent': s.cashback_percent,
            'referral_percent': s.referral_percent,
            'default_marketer_customer_percent': s.default_marketer_customer_percent,
            'default_marketer_clinic_percent': s.default_marketer_clinic_percent,
            'updated_at': s.updated_at,
        })

    def patch(self, request):
        from payments.utils import get_platform_settings
        s = get_platform_settings()
        for field in ['cashback_percent', 'referral_percent', 'default_marketer_customer_percent', 'default_marketer_clinic_percent']:
            if field in request.data:
                try:
                    value = Decimal(str(request.data[field]))
                except Exception:
                    return Response({'error': f'{field} باید یک عدد معتبر باشد'}, status=status.HTTP_400_BAD_REQUEST)
                if value < 0 or value > 100:
                    return Response({'error': f'{field} باید بین ۰ تا ۱۰۰ باشد'}, status=status.HTTP_400_BAD_REQUEST)
                setattr(s, field, value)
        s.save()
        return Response({
            'cashback_percent': s.cashback_percent,
            'referral_percent': s.referral_percent,
            'default_marketer_customer_percent': s.default_marketer_customer_percent,
            'default_marketer_clinic_percent': s.default_marketer_clinic_percent,
            'updated_at': s.updated_at,
        })


# ══════════════════════════════════════
#  مدیریت فروشگاه‌ها (مارکت‌پلیس) - مشابه مدیریت مطب‌ها
# ══════════════════════════════════════
class AdminStoreListView(generics.ListAPIView):
    """لیست همه فروشگاه‌ها با هر وضعیتی"""
    serializer_class   = AdminStoreListSerializer
    permission_classes = [IsAdminUser]
    pagination_class   = AdminPagination
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'city', 'address', 'owner__phone_number']

    def get_queryset(self):
        qs = Store.objects.select_related('owner', 'category').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class AdminStoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Store.objects.select_related('owner', 'category')
    serializer_class   = AdminStoreDetailSerializer
    permission_classes = [IsAdminUser]


class AdminStoreActionView(APIView):
    """تأیید/رد/غیرفعال‌سازی یک فروشگاه - مشابه همان منطق تأیید مطب"""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        store = Store.objects.filter(id=pk).first()
        if not store:
            return Response({'error': 'فروشگاه پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['approve', 'reject', 'deactivate']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'approve':
            if not store.address or not store.city:
                return Response({'error': 'این فروشگاه فاقد شهر یا آدرس است و قابل تأیید نیست'}, status=status.HTTP_400_BAD_REQUEST)
            store.status = 'active'
            store.save(update_fields=['status'])
            from accounts.notifications import notify
            notify(store.owner, 'فروشگاه شما تأیید شد 🎉', f'{store.name} از این پس برای مشتریان نمایش داده می‌شود', type='general', link='/store-dashboard/')
        else:
            store.status = 'inactive'
            store.save(update_fields=['status'])
            from accounts.notifications import notify
            notify(store.owner, 'وضعیت فروشگاه شما تغییر کرد', f'{store.name} در حال حاضر غیرفعال است', type='general', link='/store-dashboard/')

        return Response(AdminStoreDetailSerializer(store).data)


# ══════════════════════════════════════
#  آپلود دسته‌جمعی نمونه‌کار (تا صدها فایل در یک درخواست)
# ══════════════════════════════════════
class AdminBulkPortfolioUploadView(APIView):
    """آپلود دسته‌جمعی عکس/ویدیوی نمونه‌کار برای یک مطب مشخص - همه فایل‌های ارسالی با یک
    media_type مشترک (برای همان دسته) و is_approved=True (چون خودِ ادمین آپلود می‌کند) ثبت می‌شوند.
    برای دسته‌های خیلی بزرگ (مثلاً ۲۰۰ فایل)، فرانت‌اند باید این را در چند درخواست جداگانه (batch) بفرستد."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        clinic_id  = request.data.get('clinic_id')
        media_type = request.data.get('media_type', 'image')
        files      = request.FILES.getlist('files')

        if not clinic_id:
            return Response({'error': 'انتخاب مطب الزامی است'}, status=status.HTTP_400_BAD_REQUEST)
        if media_type not in ['image', 'video_short', 'video_long']:
            return Response({'error': 'نوع محتوا نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)
        if not files:
            return Response({'error': 'هیچ فایلی ارسال نشده'}, status=status.HTTP_400_BAD_REQUEST)

        clinic = Clinic.objects.filter(id=clinic_id).first()
        if not clinic:
            return Response({'error': 'مطب پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        created, errors = 0, []
        for f in files:
            try:
                portfolio_kwargs = {
                    'clinic': clinic, 'media_type': media_type, 'is_approved': True,
                }
                if media_type == 'image':
                    portfolio_kwargs['after_image'] = f
                else:
                    portfolio_kwargs['video'] = f
                Portfolio.objects.create(**portfolio_kwargs)
                created += 1
            except Exception as e:
                errors.append(f'{f.name}: {str(e)}')

        return Response({'created': created, 'errors': errors})


# ══════════════════════════════════════
#  مدیریت پزشکان (صفحات مستقل)
# ══════════════════════════════════════
class AdminDoctorListView(generics.ListAPIView):
    serializer_class   = AdminDoctorListSerializer
    permission_classes = [IsAdminUser]
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['full_name', 'medical_license_no', 'owner__phone_number']

    def get_queryset(self):
        qs = Doctor.objects.select_related('owner', 'clinic').order_by('-created_at')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class AdminDoctorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Doctor.objects.select_related('owner', 'clinic')
    serializer_class   = AdminDoctorDetailSerializer
    permission_classes = [IsAdminUser]


class AdminDoctorActionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        doctor = Doctor.objects.filter(id=pk).first()
        if not doctor:
            return Response({'error': 'پزشک پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['approve', 'reject', 'deactivate']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.notifications import notify
        if action == 'approve':
            if not doctor.address or not doctor.city:
                return Response({'error': 'این پزشک فاقد شهر یا آدرس است و قابل تأیید نیست'}, status=status.HTTP_400_BAD_REQUEST)
            doctor.status = 'active'
            doctor.save(update_fields=['status'])
            notify(doctor.owner, 'صفحه پزشکی شما تأیید شد 🎉', f'{doctor.full_name} از این پس برای بیماران نمایش داده می‌شود', type='general', link='/doctor-dashboard/')
        else:
            doctor.status = 'inactive'
            doctor.save(update_fields=['status'])
            notify(doctor.owner, 'وضعیت صفحه پزشکی شما تغییر کرد', f'{doctor.full_name} در حال حاضر غیرفعال است', type='general', link='/doctor-dashboard/')

        return Response(AdminDoctorDetailSerializer(doctor).data)
