from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Consultation, ConsultationAttachment, ConsultationStatusLog
from .serializers import ConsultationSerializer, ConsultationActionSerializer


class CreateConsultationView(generics.CreateAPIView):
    """کاربر فرم مشاوره رو ثبت میکنه"""
    serializer_class   = ConsultationSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        consultation = serializer.save(customer=self.request.user)
        ConsultationStatusLog.objects.create(
            consultation=consultation,
            status='pending',
            note='درخواست مشاوره ثبت شد'
        )
        from accounts.notifications import notify
        notify(
            consultation.clinic.owner, f'درخواست مشاوره جدید از {self.request.user.full_name or self.request.user.phone_number}',
            consultation.service.name if consultation.service else '', type='consultation', link='/vendor-dashboard/',
        )


class MyConsultationsView(generics.ListAPIView):
    """لیست مشاوره‌های من"""
    serializer_class   = ConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Consultation.objects.filter(
            customer=self.request.user
        ).select_related('clinic', 'service').prefetch_related('attachments', 'status_logs')


class ConsultationDetailView(generics.RetrieveAPIView):
    """جزئیات یک مشاوره"""
    serializer_class   = ConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Consultation.objects.filter(customer=self.request.user)


class ClinicConsultationsView(generics.ListAPIView):
    """مشاوره‌های رسیده به مطب(های) این ونداور - با پارامتر clinic_id می‌توان به یک مطب مشخص محدود کرد"""
    serializer_class   = ConsultationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Consultation.objects.filter(
            clinic__owner=self.request.user
        ).select_related('customer', 'service')
        clinic_id = self.request.query_params.get('clinic_id')
        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)
        return qs


class UpdateConsultationStatusView(APIView):
    """مطب وضعیت رو آپدیت میکنه"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        consultation = Consultation.objects.filter(
            id=pk,
            clinic__owner=request.user
        ).first()

        if not consultation:
            return Response({'error': 'مشاوره پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultationActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        note       = serializer.validated_data.get('note', '')

        consultation.status = new_status
        if 'visit_date' in serializer.validated_data:
            consultation.visit_date = serializer.validated_data['visit_date']
        if 'surgery_date' in serializer.validated_data:
            consultation.surgery_date = serializer.validated_data['surgery_date']
        if note:
            consultation.clinic_note = note
        consultation.save()

        # ثبت تاریخچه برای شفافیت کامل
        ConsultationStatusLog.objects.create(
            consultation=consultation,
            status=new_status,
            note=note
        )

        from accounts.notifications import notify
        notify(
            consultation.customer, f'وضعیت مشاوره شما در {consultation.clinic.name} به‌روزرسانی شد',
            f'{consultation.get_status_display()}' + (f' — {note}' if note else ''),
            type='consultation', link='/consultations/',
        )

        return Response(ConsultationSerializer(consultation).data)


class UploadAttachmentView(APIView):
    """آپلود عکس/مستندات برای فرم پذیرش"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        consultation = Consultation.objects.filter(
            id=pk,
            customer=request.user
        ).first()

        if not consultation:
            return Response({'error': 'مشاوره پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)

        file_obj  = request.data.get('file')
        file_type = request.data.get('file_type', 'other')

        if not file_obj:
            return Response({'error': 'فایلی ارسال نشده'}, status=status.HTTP_400_BAD_REQUEST)

        attachment = ConsultationAttachment.objects.create(
            consultation=consultation,
            file=file_obj,
            file_type=file_type
        )

        return Response({
            'id':   attachment.id,
            'file': attachment.file.url,
        })