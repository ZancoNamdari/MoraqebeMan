from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import User
from .models import BookingRequest, Review
from .serializers import BookingRequestSerializer, BookingActionSerializer, ReviewSerializer


class CreateBookingView(generics.CreateAPIView):
    """مشتری درخواست رزرو میده. اگر پرداخت آنلاین باشد، مبلغ همین الان از کیف‌پول کسر می‌شود -
    اگر موجودی کافی نباشد، اصلاً رزروی ثبت نمی‌شود.

    اگر مشتری کد بازاریاب را وارد کرده و رضایت خود را تأیید کرده باشد (marketer_consent=true)،
    این کد فقط برای همین سفارش ثبت می‌شود (غیرقابل‌تغییر) و کمیسیون آن پس از تأیید بازاریاب
    پرداخت خواهد شد - نه به‌صورت خودکار و نه برای سفارش‌های دیگر همین مشتری."""
    serializer_class   = BookingRequestSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(customer=request.user)

        marketer_code    = request.data.get('marketer_code', '').strip()
        marketer_consent = bool(request.data.get('marketer_consent', False))
        if marketer_code and marketer_consent:
            marketer = User.objects.filter(
                referral_code__iexact=marketer_code, is_marketer=True
            ).exclude(id=request.user.id).first()
            if marketer:
                booking.marketer_code               = marketer_code
                booking.referred_marketer            = marketer
                booking.marketer_consent             = True
                booking.marketer_commission_status   = 'pending'
                booking.save(update_fields=[
                    'marketer_code', 'referred_marketer', 'marketer_consent', 'marketer_commission_status'
                ])
            # اگر کد نامعتبر بود، سفارش بدون بازاریاب ادامه پیدا می‌کند - رد نمی‌شود چون
            # ممکن است مشتری فقط کد را اشتباه تایپ کرده باشد

        if booking.payment_method == 'online':
            from .utils import charge_booking
            success, message = charge_booking(booking, request.user)
            if not success:
                booking.delete()
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.notifications import notify
        notify(
            booking.clinic.owner, f'رزرو جدید از {request.user.full_name or request.user.phone_number}',
            f'{booking.service.name} — {booking.requested_date}', type='booking', link='/vendor-dashboard/',
        )
        if booking.marketer_commission_status == 'pending':
            notify(
                booking.referred_marketer, 'درخواست تأیید کمیسیون جدید',
                f'{request.user.full_name or request.user.phone_number} با کد شما سفارش داد', type='booking', link='/marketer-dashboard/',
            )

        return Response(BookingRequestSerializer(booking).data, status=status.HTTP_201_CREATED)


class MyBookingsView(generics.ListAPIView):
    """لیست رزروهای مشتری"""
    serializer_class   = BookingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BookingRequest.objects.filter(
            customer=self.request.user
        ).select_related('clinic', 'service')


class BookingDetailView(generics.RetrieveAPIView):
    """جزئیات یک رزرو"""
    serializer_class   = BookingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BookingRequest.objects.filter(customer=self.request.user)


class CancelBookingView(APIView):
    """لغو رزرو توسط مشتری"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = BookingRequest.objects.filter(
            id=pk,
            customer=request.user
        ).first()

        if not booking:
            return Response({'error': 'رزرو پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ['pending', 'confirmed']:
            return Response(
                {'error': 'امکان لغو این رزرو وجود ندارد'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = 'cancelled'
        booking.save()

        from .utils import refund_booking
        refund_booking(booking)

        from accounts.notifications import notify
        notify(
            booking.clinic.owner, 'یک رزرو لغو شد',
            f'{request.user.full_name or request.user.phone_number} — {booking.service.name} — {booking.requested_date}',
            type='booking', link='/vendor-dashboard/',
        )

        return Response({'message': 'رزرو لغو شد'})


class ClinicBookingsView(generics.ListAPIView):
    """لیست درخواست‌های رسیده به مطب(های) این ونداور - با پارامتر status فیلتر می‌شود (پیش‌فرض همه)
    و با پارامتر clinic_id می‌توان به یک مطب مشخص (در صورت داشتن چند مطب) محدود کرد"""
    serializer_class   = BookingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'all')
        qs = BookingRequest.objects.filter(
            clinic__owner=self.request.user
        ).select_related('customer', 'service')
        if status_filter != 'all':
            qs = qs.filter(status=status_filter)
        clinic_id = self.request.query_params.get('clinic_id')
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        return qs


class BookingActionView(APIView):
    """مطب رزرو رو تأیید یا رد میکنه"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = BookingRequest.objects.filter(
            id=pk,
            clinic__owner=request.user
        ).first()

        if not booking:
            return Response({'error': 'رزرو پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'pending':
            return Response(
                {'error': 'این رزرو قبلاً بررسی شده'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = BookingActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']

        if action == 'confirm':
            booking.status         = 'confirmed'
            booking.confirmed_time = serializer.validated_data.get('confirmed_time', booking.requested_time)
            booking.clinic_note    = serializer.validated_data.get('clinic_note', '')

        elif action == 'reject':
            booking.status      = 'rejected'
            booking.clinic_note = serializer.validated_data.get('clinic_note', '')

        booking.save()

        from accounts.notifications import notify
        if action == 'confirm':
            notify(
                booking.customer, f'رزرو شما در {booking.clinic.name} تأیید شد',
                f'{booking.service.name} — {booking.requested_date}', type='booking', link='/bookings/',
            )
        elif action == 'reject':
            notify(
                booking.customer, f'رزرو شما در {booking.clinic.name} رد شد',
                'در صورت پرداخت آنلاین، مبلغ به کیف‌پولتان بازگشت داده شد', type='booking', link='/bookings/',
            )
            from .utils import refund_booking
            refund_booking(booking)

        return Response(BookingRequestSerializer(booking).data)


class MarketerPendingCommissionsView(generics.ListAPIView):
    """رزروهایی که مشتری هنگام سفارش کد این بازاریاب را وارد کرده و در انتظار تأیید او هستند"""
    serializer_class   = BookingRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_marketer:
            return BookingRequest.objects.none()
        return BookingRequest.objects.filter(
            referred_marketer=self.request.user
        ).select_related('customer', 'clinic', 'service').order_by('-created_at')


class MarketerConfirmBookingCommissionView(APIView):
    """بازاریاب، درخواست کمیسیونی که مشتری با وارد کردن کدش هنگام سفارش ثبت کرده را تأیید یا رد می‌کند.
    فقط با تأیید صریح بازاریاب، کمیسیون واقعاً محاسبه و پرداخت می‌شود - یعنی از بین همه سفارش‌های
    یک مشتری، فقط همان سفارشی که واقعاً مرتبط با مشاوره بوده کمیسیون می‌گیرد."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        booking = BookingRequest.objects.filter(
            id=pk, referred_marketer=request.user, marketer_commission_status='pending'
        ).select_related('customer', 'service').first()
        if not booking:
            return Response({'error': 'درخواستی با این مشخصات پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['confirm', 'decline']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        if action == 'decline':
            booking.marketer_commission_status = 'declined'
            booking.save(update_fields=['marketer_commission_status'])
            return Response({'message': 'رد شد'})

        # action == 'confirm'
        if not booking.is_paid:
            return Response({'error': 'این رزرو پرداخت نشده یا قبلاً لغو شده - کمیسیونی برای تأیید وجود ندارد'}, status=status.HTTP_400_BAD_REQUEST)

        from decimal import Decimal
        from payments.models import MarketerCommission
        from payments.utils import _credit_marketer

        settings = MarketerCommission.objects.filter(marketer=request.user, is_active=True).first()
        if not settings:
            return Response({'error': 'تنظیمات کمیسیون شما فعال نیست - با پشتیبانی تماس بگیرید'}, status=status.HTTP_400_BAD_REQUEST)

        amount     = Decimal(str(booking.service.price))
        commission = (amount * Decimal(str(settings.customer_commission_percent)) / 100).quantize(Decimal('1'))
        _credit_marketer(request.user, commission, booking, f'کمیسیون مشاوره - مشتری {booking.customer.phone_number}')

        booking.marketer_commission_status = 'confirmed'
        booking.save(update_fields=['marketer_commission_status'])
        return Response(BookingRequestSerializer(booking).data)


class CreateReviewView(generics.CreateAPIView):
    """ثبت نظر بعد از انجام سرویس"""
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        booking = serializer.validated_data['booking']

        # فقط رزروهای completed میتونن نظر بدن
        if booking.status != 'completed':
            from rest_framework.exceptions import ValidationError
            raise ValidationError('فقط بعد از انجام سرویس میتوانید نظر بدهید')

        # هر رزرو فقط یه نظر میتونه داشته باشه
        if Review.objects.filter(booking=booking).exists():
            from rest_framework.exceptions import ValidationError
            raise ValidationError('قبلاً نظر ثبت کرده‌اید')

        serializer.save(
            customer=self.request.user,
            clinic=booking.clinic
        )