import random
from decimal import Decimal
from django.db.models import Avg
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from accounts.models import User
from clinics.models import Clinic
from .models import (
    Doctor, DoctorTariff, DoctorPost, DoctorAvailability,
    DoctorAppointment, DoctorConversation, DoctorChatMessage, DoctorReview,
)
from .serializers import (
    DoctorListSerializer, DoctorDetailSerializer, DoctorTariffSerializer, DoctorPostSerializer,
    DoctorAvailabilitySerializer, DoctorAppointmentSerializer,
    DoctorConversationSerializer, DoctorChatMessageSerializer, DoctorReviewSerializer,
)


# ══════════════════════════════════════
#  مرور عمومی
# ══════════════════════════════════════
class DoctorListView(generics.ListAPIView):
    serializer_class   = DoctorListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Doctor.objects.filter(status='active').order_by('-rating', '-created_at')
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city=city)
        return qs


class DoctorDetailView(generics.RetrieveAPIView):
    queryset           = Doctor.objects.filter(status='active')
    serializer_class   = DoctorDetailSerializer
    permission_classes = [AllowAny]


class DoctorReviewListView(generics.ListAPIView):
    """نظرات یک پزشک مشخص - برای نمایش در صفحه عمومی او"""
    serializer_class   = DoctorReviewSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return DoctorReview.objects.filter(doctor_id=self.kwargs['pk'])


# ══════════════════════════════════════
#  ثبت‌نام پزشک - مستقل یا وصل به یک مطب موجود (یا هر دو)
# ══════════════════════════════════════
class DoctorRegisterView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = []

    def post(self, request):
        phone               = request.data.get('phone_number')
        full_name           = request.data.get('full_name')
        medical_license_no  = request.data.get('medical_license_no')
        specialty           = request.data.get('specialty', '')
        bio                  = request.data.get('bio', '')
        address              = request.data.get('address', '')
        city                 = request.data.get('city', '')
        instagram            = request.data.get('instagram', '')
        rubika               = request.data.get('rubika', '')
        bale                  = request.data.get('bale', '')
        clinic_id             = request.data.get('clinic_id')  # اختیاری
        photo                 = request.FILES.get('photo')

        if not all([phone, full_name, medical_license_no]):
            return Response({'error': 'نام، شماره موبایل و کد نظام پزشکی الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        if not photo:
            return Response({'error': 'تصویر پزشک الزامی است'}, status=status.HTTP_400_BAD_REQUEST)

        clinic = None
        if clinic_id:
            clinic = Clinic.objects.filter(id=clinic_id).first()
            if not clinic:
                return Response({'error': 'مطب انتخاب‌شده معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)

        user, _ = User.objects.get_or_create(phone_number=phone)
        user.full_name = full_name
        user.save()

        if Doctor.objects.filter(owner=user).exists():
            return Response({'error': 'برای این شماره موبایل قبلاً یک صفحه پزشک ثبت شده است'}, status=status.HTTP_400_BAD_REQUEST)

        doctor = Doctor.objects.create(
            owner=user, clinic=clinic, full_name=full_name, medical_license_no=medical_license_no,
            specialty=specialty, bio=bio, address=address, city=city, phone=phone,
            instagram=instagram, rubika=rubika, bale=bale, photo=photo, status='pending',
        )

        return Response({'message': 'درخواست ثبت‌نام شما ارسال شد.', 'user_id': user.id, 'doctor_id': doctor.id})


# ══════════════════════════════════════
#  پنل پزشک
# ══════════════════════════════════════
class MyDoctorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class   = DoctorDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return Doctor.objects.get(owner=self.request.user)


class MyDoctorTariffsView(generics.ListCreateAPIView):
    serializer_class   = DoctorTariffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorTariff.objects.filter(doctor__owner=self.request.user)

    def perform_create(self, serializer):
        doctor = Doctor.objects.get(owner=self.request.user)
        serializer.save(doctor=doctor)


class MyDoctorTariffDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = DoctorTariffSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorTariff.objects.filter(doctor__owner=self.request.user)


class MyDoctorPostsView(generics.ListCreateAPIView):
    serializer_class   = DoctorPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorPost.objects.filter(doctor__owner=self.request.user)

    def perform_create(self, serializer):
        doctor = Doctor.objects.get(owner=self.request.user)
        serializer.save(doctor=doctor)


class MyDoctorPostDetailView(generics.RetrieveDestroyAPIView):
    serializer_class   = DoctorPostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorPost.objects.filter(doctor__owner=self.request.user)


class MyDoctorAvailabilityView(generics.ListCreateAPIView):
    serializer_class   = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor__owner=self.request.user)

    def perform_create(self, serializer):
        doctor = Doctor.objects.get(owner=self.request.user)
        serializer.save(doctor=doctor)


class MyDoctorAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = DoctorAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor__owner=self.request.user)


class MyDoctorAppointmentsView(generics.ListAPIView):
    serializer_class   = DoctorAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DoctorAppointment.objects.filter(doctor__owner=self.request.user).select_related('patient', 'doctor')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        return qs


class DoctorAppointmentActionView(APIView):
    """تأیید یا رد یک نوبت توسط پزشک"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appt = DoctorAppointment.objects.filter(id=pk, doctor__owner=request.user, status='pending').first()
        if not appt:
            return Response({'error': 'نوبت پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['confirm', 'reject']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        appt.status = 'confirmed' if action == 'confirm' else 'rejected'
        appt.doctor_note = request.data.get('doctor_note', '')
        appt.resolved_at = timezone.now()
        appt.save()

        from accounts.notifications import notify
        if action == 'confirm':
            notify(appt.patient, f'نوبت شما نزد دکتر {appt.doctor.full_name} تأیید شد', f'{appt.requested_date} - {appt.requested_time}', type='general', link='/doctor-appointments/')
        else:
            notify(appt.patient, f'نوبت شما نزد دکتر {appt.doctor.full_name} رد شد', appt.doctor_note, type='general', link='/doctor-appointments/')

        return Response(DoctorAppointmentSerializer(appt).data)


class DoctorAppointmentCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appt = DoctorAppointment.objects.filter(id=pk, doctor__owner=request.user, status='confirmed').first()
        if not appt:
            return Response({'error': 'نوبت پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        appt.status = 'completed'
        appt.resolved_at = timezone.now()
        appt.save()
        return Response(DoctorAppointmentSerializer(appt).data)


class DoctorRescheduleRespondView(APIView):
    """پزشک، درخواست جابه‌جایی نوبتی که بیمار فرستاده را تأیید یا رد می‌کند"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appt = DoctorAppointment.objects.filter(id=pk, doctor__owner=request.user, status='reschedule_requested').first()
        if not appt:
            return Response({'error': 'درخواستی پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action not in ['accept', 'decline']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.notifications import notify
        if action == 'accept':
            from datetime import datetime
            from .utils import validate_appointment_slot
            is_valid, error = validate_appointment_slot(
                appt.doctor, appt.reschedule_requested_date, appt.reschedule_requested_time, exclude_appointment_id=appt.id
            )
            if not is_valid:
                return Response({'error': f'این زمان دیگر در دسترس نیست: {error}'}, status=status.HTTP_400_BAD_REQUEST)

            appt.requested_date = appt.reschedule_requested_date
            appt.requested_time = appt.reschedule_requested_time
            appt.reschedule_requested_date = None
            appt.reschedule_requested_time = None
            appt.status = 'confirmed'
            notify(appt.patient, 'درخواست جابه‌جایی نوبت شما تأیید شد', f'{appt.requested_date} - {appt.requested_time}', type='general', link='/doctor-appointments/')
        else:
            appt.status = 'confirmed'
            appt.reschedule_requested_date = None
            appt.reschedule_requested_time = None
            notify(appt.patient, 'درخواست جابه‌جایی نوبت شما رد شد', 'نوبت شما در زمان قبلی باقی می‌ماند', type='general', link='/doctor-appointments/')
        appt.save()

        return Response(DoctorAppointmentSerializer(appt).data)


# ══════════════════════════════════════
#  رزرو نوبت توسط بیمار
# ══════════════════════════════════════
class CreateDoctorAppointmentView(APIView):
    """بیمار درخواست نوبت می‌فرستد. زمان درخواستی باید داخل یکی از بازه‌های در دسترس‌بودن پزشک باشد."""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        doctor_id      = request.data.get('doctor')
        full_name      = request.data.get('full_name')
        national_id    = request.data.get('national_id')
        phone          = request.data.get('phone')
        disease_type   = request.data.get('disease_type')
        requested_date = request.data.get('requested_date')
        requested_time = request.data.get('requested_time')

        if not all([doctor_id, full_name, national_id, phone, disease_type, requested_date, requested_time]):
            return Response({'error': 'همه فیلدها الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        doctor = Doctor.objects.filter(id=doctor_id, status='active').first()
        if not doctor:
            return Response({'error': 'پزشک پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        from datetime import datetime
        try:
            req_date = datetime.strptime(requested_date, '%Y-%m-%d').date()
            req_time = datetime.strptime(requested_time, '%H:%M').time()
        except ValueError:
            return Response({'error': 'فرمت تاریخ یا ساعت نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from .utils import validate_appointment_slot
        is_valid, error = validate_appointment_slot(doctor, req_date, req_time)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        appt = DoctorAppointment.objects.create(
            doctor=doctor, patient=request.user, full_name=full_name, national_id=national_id,
            phone=phone, disease_type=disease_type, requested_date=req_date, requested_time=req_time,
            id_card_image=request.FILES.get('id_card_image'),
            prescription_image=request.FILES.get('prescription_image'),
        )

        from accounts.notifications import notify
        notify(doctor.owner, f'درخواست نوبت جدید از {full_name}', f'{requested_date} - {requested_time}', type='general', link='/doctor-dashboard/')

        return Response(DoctorAppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)


class MyAppointmentsView(generics.ListAPIView):
    """نوبت‌های خودِ بیمار"""
    serializer_class   = DoctorAppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorAppointment.objects.filter(patient=self.request.user).select_related('doctor')


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appt = DoctorAppointment.objects.filter(id=pk, patient=request.user).exclude(status__in=['completed', 'cancelled', 'rejected']).first()
        if not appt:
            return Response({'error': 'نوبت پیدا نشد یا قابل لغو نیست'}, status=status.HTTP_404_NOT_FOUND)
        appt.status = 'cancelled'
        appt.resolved_at = timezone.now()
        appt.save()

        from accounts.notifications import notify
        notify(appt.doctor.owner, 'یک نوبت لغو شد', appt.full_name, type='general', link='/doctor-dashboard/')

        return Response({'message': 'نوبت لغو شد'})


class RequestRescheduleView(APIView):
    """بیمار برای یک نوبت تأییدشده، درخواست جابه‌جایی به زمان دیگر می‌فرستد"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        appt = DoctorAppointment.objects.filter(id=pk, patient=request.user, status='confirmed').first()
        if not appt:
            return Response({'error': 'این نوبت قابل جابه‌جایی نیست'}, status=status.HTTP_400_BAD_REQUEST)

        new_date = request.data.get('requested_date')
        new_time = request.data.get('requested_time')
        if not new_date or not new_time:
            return Response({'error': 'تاریخ و ساعت جدید الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        from datetime import datetime
        try:
            new_date_obj = datetime.strptime(new_date, '%Y-%m-%d').date()
            new_time_obj = datetime.strptime(new_time, '%H:%M').time()
        except ValueError:
            return Response({'error': 'فرمت تاریخ یا ساعت نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from .utils import validate_appointment_slot
        is_valid, error = validate_appointment_slot(appt.doctor, new_date_obj, new_time_obj, exclude_appointment_id=appt.id)
        if not is_valid:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        appt.reschedule_requested_date = new_date
        appt.reschedule_requested_time = new_time
        appt.reschedule_note = request.data.get('note', '')
        appt.status = 'reschedule_requested'
        appt.save()

        from accounts.notifications import notify
        notify(appt.doctor.owner, f'درخواست جابه‌جایی نوبت از {appt.full_name}', f'{new_date} - {new_time}', type='general', link='/doctor-dashboard/')

        return Response(DoctorAppointmentSerializer(appt).data)


# ══════════════════════════════════════
#  چت مستقیم بیمار-پزشک
# ══════════════════════════════════════
class StartConversationView(APIView):
    """بیمار یک گفتگوی جدید با یک پزشک شروع می‌کند (یا گفتگوی موجود را برمی‌گرداند)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        doctor_id = request.data.get('doctor')
        doctor = Doctor.objects.filter(id=doctor_id, status='active').first()
        if not doctor:
            return Response({'error': 'پزشک پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        conversation, _ = DoctorConversation.objects.get_or_create(doctor=doctor, patient=request.user)
        return Response(DoctorConversationSerializer(conversation, context={'request': request, 'viewer_role': 'patient'}).data)


class MyPatientConversationsView(generics.ListAPIView):
    """گفتگوهای بیمار با پزشکان مختلف"""
    serializer_class   = DoctorConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorConversation.objects.filter(patient=self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'viewer_role': 'patient'}


class MyDoctorConversationsView(generics.ListAPIView):
    """گفتگوهای دریافتی پزشک از بیماران مختلف"""
    serializer_class   = DoctorConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DoctorConversation.objects.filter(doctor__owner=self.request.user)

    def get_serializer_context(self):
        return {**super().get_serializer_context(), 'viewer_role': 'doctor'}


class SendMessageView(APIView):
    """ارسال پیام در یک گفتگو - برای هر دو طرف (بیمار یا پزشک) کار می‌کند"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = DoctorConversation.objects.filter(id=pk).first()
        if not conversation:
            return Response({'error': 'گفتگو پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        if conversation.patient_id == request.user.id:
            sender = 'patient'
        elif conversation.doctor.owner_id == request.user.id:
            sender = 'doctor'
        else:
            return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'متن پیام خالی است'}, status=status.HTTP_400_BAD_REQUEST)

        message = DoctorChatMessage.objects.create(conversation=conversation, sender=sender, content=content)

        from accounts.notifications import notify
        if sender == 'patient':
            notify(conversation.doctor.owner, f'پیام جدید از {conversation.patient.full_name or conversation.patient.phone_number}', content[:60], type='general', link='/doctor-dashboard/')
        else:
            notify(conversation.patient, f'پیام جدید از دکتر {conversation.doctor.full_name}', content[:60], type='general', link='/doctor-chat/')

        return Response(DoctorChatMessageSerializer(message).data, status=status.HTTP_201_CREATED)


class MarkMessagesReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        conversation = DoctorConversation.objects.filter(id=pk).first()
        if not conversation:
            return Response({'error': 'گفتگو پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        if conversation.patient_id == request.user.id:
            DoctorChatMessage.objects.filter(conversation=conversation, sender='doctor', is_read=False).update(is_read=True)
        elif conversation.doctor.owner_id == request.user.id:
            DoctorChatMessage.objects.filter(conversation=conversation, sender='patient', is_read=False).update(is_read=True)
        else:
            return Response({'error': 'دسترسی ندارید'}, status=status.HTTP_403_FORBIDDEN)

        return Response({'message': 'ok'})


# ══════════════════════════════════════
#  نظرات
# ══════════════════════════════════════
class CreateDoctorReviewView(APIView):
    """بیمار فقط بعد از نوبت انجام‌شده (completed) می‌تواند نظر بدهد"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        appointment_id = request.data.get('appointment')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')

        appt = DoctorAppointment.objects.filter(id=appointment_id, patient=request.user, status='completed').first()
        if not appt:
            return Response({'error': 'فقط بعد از نوبت انجام‌شده می‌توانید نظر بدهید'}, status=status.HTTP_400_BAD_REQUEST)
        if DoctorReview.objects.filter(appointment=appt).exists():
            return Response({'error': 'قبلاً برای این نوبت نظر ثبت کرده‌اید'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            rating = int(rating)
            assert 1 <= rating <= 5
        except (TypeError, ValueError, AssertionError):
            return Response({'error': 'امتیاز باید بین ۱ تا ۵ باشد'}, status=status.HTTP_400_BAD_REQUEST)

        review = DoctorReview.objects.create(doctor=appt.doctor, patient=request.user, appointment=appt, rating=rating, comment=comment)

        avg = DoctorReview.objects.filter(doctor=appt.doctor).aggregate(avg=Avg('rating'))['avg'] or 0
        appt.doctor.rating = Decimal(str(round(avg, 2)))
        appt.doctor.save(update_fields=['rating'])

        return Response(DoctorReviewSerializer(review).data, status=status.HTTP_201_CREATED)
