import random
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, OTPCode, MarketerProfile, MarketerConsultation, Notification, CommissionRequest
from .serializers import (
    SendOTPSerializer, VerifyOTPSerializer, UserProfileSerializer,
    MarketerListSerializer, MarketerConsultationSerializer, NotificationSerializer,
    CommissionRequestSerializer,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


class SendOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone_number']
        code  = str(random.randint(100000, 999999))

        
        OTPCode.objects.filter(phone_number=phone, is_used=False).update(is_used=True)
        OTPCode.objects.create(phone_number=phone, code=code)

        
        print(f"[OTP] {phone} → {code}")

        return Response({'message': 'کد تأیید ارسال شد'})


class VerifyOTPView(APIView):
    permission_classes = []

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone = serializer.validated_data['phone_number']
        code  = serializer.validated_data['code']

        otp = OTPCode.objects.filter(
            phone_number=phone, code=code, is_used=False
        ).order_by('-created_at').first()

        if not otp or not otp.is_valid():
            return Response(
                {'error': 'کد اشتباه یا منقضی شده'},
                status=status.HTTP_400_BAD_REQUEST
            )

        otp.is_used = True
        otp.save()

        user, created = User.objects.get_or_create(phone_number=phone)
        user.is_verified = True
        user.save()

        # اگه کاربر جدیده و کد معرف داشت
        if created:
            referral_code = request.data.get('referral_code', '')
            if referral_code:
                referrer = User.objects.filter(referral_code=referral_code).first()
                if referrer and referrer != user:
                    user.referred_by = referrer
                    user.save()

        return Response({
            'is_new_user': created,
            'tokens':      get_tokens_for_user(user),
            'user':        UserProfileSerializer(user).data,
        })


class ReferralInfoView(APIView):
    """اطلاعات معرف کاربر"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        referrals_count = User.objects.filter(referred_by=user).count()
        return Response({
            'referral_code':   user.referral_code,
            'referral_link':   request.build_absolute_uri('/login/') + f'?ref={user.referral_code}',
            'referrals_count': referrals_count,
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
class VendorRegisterView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = []

    def post(self, request):
        phone           = request.data.get('phone_number')
        full_name        = request.data.get('full_name')
        medical_license  = request.data.get('medical_license_no', '')
        clinic_name      = request.data.get('clinic_name')
        marketer_code    = request.data.get('marketer_code', '')
        category_id      = request.data.get('category_id')
        city             = request.data.get('city', '').strip()
        address          = request.data.get('address', '').strip()
        description      = request.data.get('description', '').strip()
        clinic_image     = request.FILES.get('clinic_image')
        cover_image      = request.FILES.get('cover_image')

        if not all([phone, full_name, clinic_name, city, address]):
            return Response({'error': 'اطلاعات ناقص است - نام، نام مطب، شهر و آدرس الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        if not clinic_image or not cover_image:
            return Response({'error': 'تصویر مطب و تصویر کاور هر دو الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        from clinics.models import Clinic, Category, ClinicImage

        category = None
        if category_id:
            category = Category.objects.filter(id=category_id).first()
            if not category:
                return Response({'error': 'نوع کسب‌وکار انتخاب‌شده معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(phone_number=phone)
        user.full_name  = full_name
        user.is_vendor  = True          # ← فقط فلگ رو ست می‌کنیم، role دست نمی‌خوره
        user.save()

        marketer = None
        if marketer_code:
            marketer = User.objects.filter(referral_code=marketer_code, is_marketer=True).first()

        clinic = Clinic.objects.create(
            owner=user, name=clinic_name, status='pending',
            address=address, city=city, phone=phone,
            description=description,
            referred_by_marketer=marketer,
            category=category,
        )

        ClinicImage.objects.create(clinic=clinic, image=clinic_image, is_cover=False)
        ClinicImage.objects.create(clinic=clinic, image=cover_image, is_cover=True)

        return Response({
            'message':   'درخواست ثبت‌نام شما ارسال شد.',
            'user_id':   user.id,
            'clinic_id': clinic.id,
        })
class MarketerRegisterView(APIView):
    """ثبت‌نام بازاریاب - برای کاربر لاگین‌شده، فلگ is_marketer را فعال می‌کند
    و تنظیمات کمیسیون پیش‌فرض را می‌سازد (وگرنه هیچ کمیسیونی محاسبه نمی‌شود)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        full_name = request.data.get('full_name', '')
        specialty  = request.data.get('specialty', '')
        bio         = request.data.get('bio', '')

        if full_name:
            user.full_name = full_name
        user.is_marketer = True
        user.save()

        from payments.models import MarketerCommission
        from payments.utils import get_platform_settings
        platform_settings = get_platform_settings()
        MarketerCommission.objects.get_or_create(marketer=user, defaults={
            'customer_commission_percent': platform_settings.default_marketer_customer_percent,
            'clinic_commission_percent': platform_settings.default_marketer_clinic_percent,
        })

        profile, _ = MarketerProfile.objects.get_or_create(marketer=user)
        if specialty:
            profile.specialty = specialty
        if bio:
            profile.bio = bio
        profile.save()

        return Response({
            'message': 'ثبت‌نام بازاریابی با موفقیت انجام شد',
            'referral_code': user.referral_code,
        })
        
class MarketerDashboardView(APIView):
    """داده‌های کامل داشبورد بازاریاب"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_marketer:
            return Response({'error': 'دسترسی غیرمجاز'}, status=403)

        from clinics.models import Clinic
        from payments.models import Transaction, MarketerCommission
        from django.db.models import Sum

        # افرادی که با کد معرف این بازاریاب ثبت‌نام کرده‌اند (چه بعداً ونداور/بازاریاب شده باشند چه نه)
        referred_customers = User.objects.filter(referred_by=user)
        referred_clinics   = Clinic.objects.filter(referred_by_marketer=user)

        commission_txns = Transaction.objects.filter(
            wallet__user=user,
            transaction_type='marketer_commission'
        )

        customer_commission = commission_txns.filter(description__icontains='کمیسیون مشتری').aggregate(Sum('amount'))['amount__sum'] or 0
        clinic_commission   = commission_txns.filter(description__icontains='کمیسیون مطب').aggregate(Sum('amount'))['amount__sum'] or 0

        customers_data = []
        for c in referred_customers:
            spent = Transaction.objects.filter(
                transaction_type='payment', status='success', booking__customer=c
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            earned = commission_txns.filter(booking__customer=c).aggregate(Sum('amount'))['amount__sum'] or 0
            customers_data.append({
                'phone': c.phone_number,
                'joined': c.created_at.strftime('%Y-%m-%d'),
                'total_spent': spent,
                'commission_earned': earned,
            })

        clinics_data = []
        for c in referred_clinics:
            revenue = Transaction.objects.filter(
                transaction_type='payment', status='success', booking__clinic=c
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            earned = commission_txns.filter(booking__clinic=c).aggregate(Sum('amount'))['amount__sum'] or 0
            clinics_data.append({
                'name': c.name,
                'joined': c.created_at.strftime('%Y-%m-%d'),
                'total_revenue': revenue,
                'commission_earned': earned,
            })

        commission_settings = MarketerCommission.objects.filter(marketer=user).first()

        return Response({
            'customer_ref_code':   user.referral_code,
            'clinic_ref_code':     user.referral_code,  # می‌تونی بعداً دو کد جدا بسازی
            'referral_link':       request.build_absolute_uri('/login/') + f'?ref={user.referral_code}',
            'clinic_referral_link': request.build_absolute_uri('/vendor-register/') + f'?ref={user.referral_code}',
            'total_commission':    customer_commission + clinic_commission,
            'customer_commission': customer_commission,
            'clinic_commission':   clinic_commission,
            'customer_commission_percent': commission_settings.customer_commission_percent if commission_settings else None,
            'clinic_commission_percent':   commission_settings.clinic_commission_percent if commission_settings else None,
            'commission_active':   commission_settings.is_active if commission_settings else False,
            'customers': customers_data,
            'clinics': clinics_data,
            'transactions': [
                {'description': t.description, 'amount': t.amount, 'created_at': t.created_at.strftime('%Y-%m-%d')}
                for t in commission_txns.order_by('-created_at')[:20]
            ],
        })


# ══════════════════════════════════════
#  مشاوره از بازاریاب (تب جدید) - کاربر عادی از یک بازاریاب مشخص مشاوره می‌گیرد
#  و در همین لحظه، اگر معرف نداشته باشد، همان بازاریاب به‌طور دائمی و غیرقابل‌تغییر
#  به‌عنوان معرف او ثبت می‌شود.
# ══════════════════════════════════════
class MarketerListView(generics.ListAPIView):
    """لیست عمومی بازاریاب‌های آماده مشاوره - برای انتخاب توسط کاربر عادی"""
    queryset           = MarketerProfile.objects.filter(is_available=True, marketer__is_marketer=True).select_related('marketer')
    serializer_class   = MarketerListSerializer
    permission_classes = [AllowAny]


class UpdateMarketerProfileView(APIView):
    """مشاهده و ویرایش تخصص/بیوگرافی خودِ بازاریاب"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_marketer:
            return Response({'error': 'دسترسی غیرمجاز'}, status=403)
        profile, _ = MarketerProfile.objects.get_or_create(marketer=user)
        return Response({
            'specialty': profile.specialty,
            'bio': profile.bio,
            'is_available': profile.is_available,
        })

    def patch(self, request):
        user = request.user
        if not user.is_marketer:
            return Response({'error': 'دسترسی غیرمجاز'}, status=403)
        profile, _ = MarketerProfile.objects.get_or_create(marketer=user)
        if 'specialty' in request.data:
            profile.specialty = request.data['specialty']
        if 'bio' in request.data:
            profile.bio = request.data['bio']
        if 'is_available' in request.data:
            profile.is_available = request.data['is_available']
        profile.save()
        return Response(MarketerListSerializer(profile).data)


class CreateMarketerConsultationView(APIView):
    """کاربر عادی از یک بازاریاب مشخص درخواست مشاوره می‌دهد.
    توجه: این دیگر باعث ثبت دائمی معرف روی حساب کاربر نمی‌شود - کمیسیون از این پس
    به‌ازای هر سفارش جداگانه و با وارد کردن صریح کد بازاریاب توسط مشتری در همان سفارش
    تعیین می‌شود (نه یک‌بار برای همیشه)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        marketer_id = request.data.get('marketer_id')
        topic        = request.data.get('topic', '').strip()
        message       = request.data.get('message', '').strip()

        if not marketer_id or not message:
            return Response({'error': 'انتخاب بازاریاب و متن پیام الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        marketer = User.objects.filter(id=marketer_id, is_marketer=True).first()
        if not marketer:
            return Response({'error': 'بازاریاب پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if marketer.id == user.id:
            return Response({'error': 'نمی‌توانید از خودتان مشاوره بگیرید'}, status=status.HTTP_400_BAD_REQUEST)

        consultation = MarketerConsultation.objects.create(
            customer=user, marketer=marketer,
            topic=topic or 'مشاوره عمومی', message=message,
        )

        from .notifications import notify
        notify(
            marketer, f'سوال جدید از {user.full_name or user.phone_number}',
            message[:150], type='marketer_consultation', link='/marketer-dashboard/',
        )

        return Response(MarketerConsultationSerializer(consultation).data, status=status.HTTP_201_CREATED)


class MyMarketerConsultationsView(generics.ListAPIView):
    """درخواست‌های مشاوره‌ای که خودِ کاربر ثبت کرده (برای دیدن پاسخ بازاریاب)"""
    serializer_class   = MarketerConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MarketerConsultation.objects.filter(customer=self.request.user)


class MarketerConsultationsReceivedView(generics.ListAPIView):
    """درخواست‌های مشاوره‌ای که برای این بازاریاب ثبت شده"""
    serializer_class   = MarketerConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_marketer:
            return MarketerConsultation.objects.none()
        return MarketerConsultation.objects.filter(marketer=self.request.user)


class AnswerMarketerConsultationView(APIView):
    """پاسخ بازاریاب به یک درخواست مشاوره"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        consultation = MarketerConsultation.objects.filter(id=pk, marketer=request.user).first()
        if not consultation:
            return Response({'error': 'درخواست پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        reply = request.data.get('reply', '').strip()
        if not reply:
            return Response({'error': 'متن پاسخ الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        consultation.reply      = reply
        consultation.status     = 'answered'
        consultation.replied_at = timezone.now()
        consultation.save()

        from .notifications import notify
        notify(
            consultation.customer,
            f'{consultation.marketer.full_name or "متخصص"} به سوال شما پاسخ داد',
            consultation.reply[:150],
            type='marketer_consultation', link='/advisors/',
        )

        return Response(MarketerConsultationSerializer(consultation).data)


# ══════════════════════════════════════
#  اعلان‌ها
# ══════════════════════════════════════
class NotificationListView(generics.ListAPIView):
    """لیست اعلان‌های کاربر لاگین‌شده - جدیدترین اول"""
    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class UnreadNotificationCountView(APIView):
    """فقط تعداد اعلان‌های خوانده‌نشده - برای نمایش عدد روی آیکون زنگوله بدون گرفتن کل لیست"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class MarkNotificationReadView(APIView):
    """علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = Notification.objects.filter(id=pk, user=request.user).first()
        if not notification:
            return Response({'error': 'اعلان پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({'message': 'خوانده شد'})


class MarkAllNotificationsReadView(APIView):
    """علامت‌گذاری همه اعلان‌های کاربر به‌عنوان خوانده‌شده"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'همه اعلان‌ها خوانده شدند'})

# ══════════════════════════════════════
#  درخواست رابطه کمیسیون (جایگزین دوطرفه و مطمئن‌تر برای وارد کردن کد معرف)
#  هر کاربری (مشتری عادی، بازاریاب، ونداور) می‌تواند کد فرد دیگری را وارد کند و درخواست بفرستد؛
#  فقط با تأیید صریح طرف مقابل، رابطه کمیسیون برقرار می‌شود.
# ══════════════════════════════════════
class CreateCommissionRequestView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get('code', '').strip()
        if not code:
            return Response({'error': 'کد معرف را وارد کنید'}, status=status.HTTP_400_BAD_REQUEST)

        target = User.objects.filter(referral_code__iexact=code).first()
        if not target:
            return Response({'error': 'کاربری با این کد پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response({'error': 'نمی‌توانید برای خودتان درخواست بفرستید'}, status=status.HTTP_400_BAD_REQUEST)

        # اگر قبلاً رابطه‌ای برقرار شده، درخواست جدید بی‌فایده است
        target_clinic = target.clinics.first()
        if target_clinic:
            if target_clinic.referred_by_marketer_id:
                return Response({'error': 'این مطب قبلاً معرف ثبت‌شده‌ای دارد'}, status=status.HTTP_400_BAD_REQUEST)
        elif target.referred_by_id:
            return Response({'error': 'این کاربر قبلاً معرف ثبت‌شده‌ای دارد'}, status=status.HTTP_400_BAD_REQUEST)

        if CommissionRequest.objects.filter(requester=request.user, target=target, status='pending').exists():
            return Response({'error': 'درخواستی از قبل برای این کاربر در انتظار تأیید است'}, status=status.HTTP_400_BAD_REQUEST)

        req = CommissionRequest.objects.create(requester=request.user, target=target, target_code=code)

        from .notifications import notify
        notify(
            target, f'{request.user.full_name or request.user.phone_number} درخواست رابطه کمیسیون فرستاد',
            'برای تأیید یا رد این درخواست به بخش درخواست‌های کمیسیون مراجعه کنید',
            type='general', link='/commission-requests/',
        )

        return Response(CommissionRequestSerializer(req).data, status=status.HTTP_201_CREATED)


class MySentCommissionRequestsView(generics.ListAPIView):
    """درخواست‌هایی که خودم فرستاده‌ام"""
    serializer_class   = CommissionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CommissionRequest.objects.filter(requester=self.request.user)


class MyReceivedCommissionRequestsView(generics.ListAPIView):
    """درخواست‌هایی که برای من فرستاده شده (برای تأیید/رد)"""
    serializer_class   = CommissionRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CommissionRequest.objects.filter(target=self.request.user)


class RespondCommissionRequestView(APIView):
    """تأیید یا رد یک درخواست دریافتی. فقط با تأیید صریح، رابطه کمیسیون برقرار می‌شود."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        req = CommissionRequest.objects.filter(id=pk, target=request.user, status='pending').first()
        if not req:
            return Response({'error': 'درخواستی پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['accept', 'decline']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        from .notifications import notify

        if action == 'decline':
            req.status = 'declined'
            req.resolved_at = timezone.now()
            req.save()
            notify(req.requester, 'درخواست کمیسیون شما رد شد', '', type='general', link='/commission-requests/')
            return Response(CommissionRequestSerializer(req).data)

        # action == 'accept'
        target_clinic = req.target.clinics.first()
        if target_clinic:
            if target_clinic.referred_by_marketer_id:
                return Response({'error': 'این مطب در همین فاصله معرف دیگری پیدا کرده - قابل تأیید نیست'}, status=status.HTTP_400_BAD_REQUEST)
            target_clinic.referred_by_marketer = req.requester
            target_clinic.save(update_fields=['referred_by_marketer'])
        else:
            if req.target.referred_by_id:
                return Response({'error': 'شما در همین فاصله معرف دیگری پیدا کرده‌اید - قابل تأیید نیست'}, status=status.HTTP_400_BAD_REQUEST)
            req.target.referred_by = req.requester
            req.target.save(update_fields=['referred_by'])

        req.status = 'accepted'
        req.resolved_at = timezone.now()
        req.save()

        notify(req.requester, 'درخواست کمیسیون شما تأیید شد 🎉', f'{req.target.full_name or req.target.phone_number}', type='general', link='/commission-requests/')

        return Response(CommissionRequestSerializer(req).data)
