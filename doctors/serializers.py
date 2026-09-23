from rest_framework import serializers
from .models import (
    Doctor, DoctorTariff, DoctorPost, DoctorAvailability,
    DoctorAppointment, DoctorConversation, DoctorChatMessage, DoctorReview,
)


class DoctorTariffSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DoctorTariff
        fields = ['id', 'title', 'price', 'is_active']


class DoctorPostSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DoctorPost
        fields = ['id', 'media_type', 'image', 'video', 'caption', 'created_at']


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)

    class Meta:
        model  = DoctorAvailability
        fields = ['id', 'weekday', 'weekday_display', 'start_time', 'end_time', 'is_active']


class DoctorListSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model  = Doctor
        fields = ['id', 'full_name', 'specialty', 'city', 'rating', 'photo_url']

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url if obj.photo else None


class DoctorDetailSerializer(DoctorListSerializer):
    """برای صفحه عمومی پزشک و همچنین برای مدیریت پروفایل توسط خودِ پزشک"""
    tariffs         = DoctorTariffSerializer(many=True, read_only=True)
    posts            = DoctorPostSerializer(many=True, read_only=True)
    availabilities   = DoctorAvailabilitySerializer(many=True, read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    clinic_name      = serializers.CharField(source='clinic.name', read_only=True)

    class Meta(DoctorListSerializer.Meta):
        fields = DoctorListSerializer.Meta.fields + [
            'medical_license_no', 'bio', 'address', 'phone',
            'instagram', 'rubika', 'bale', 'status', 'status_display',
            'clinic', 'clinic_name', 'tariffs', 'posts', 'availabilities', 'created_at',
        ]


class DoctorAppointmentSerializer(serializers.ModelSerializer):
    doctor_name     = serializers.CharField(source='doctor.full_name', read_only=True)
    patient_phone   = serializers.CharField(source='patient.phone_number', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = DoctorAppointment
        fields = [
            'id', 'doctor', 'doctor_name', 'patient_phone', 'tracking_code',
            'full_name', 'national_id', 'phone', 'disease_type',
            'requested_date', 'requested_time', 'id_card_image', 'prescription_image',
            'status', 'status_display', 'doctor_note',
            'reschedule_requested_date', 'reschedule_requested_time', 'reschedule_note',
            'created_at', 'resolved_at',
        ]
        read_only_fields = ['tracking_code', 'status', 'doctor_note', 'created_at', 'resolved_at']


class DoctorChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DoctorChatMessage
        fields = ['id', 'sender', 'content', 'is_read', 'created_at']


class DoctorConversationSerializer(serializers.ModelSerializer):
    doctor_name    = serializers.CharField(source='doctor.full_name', read_only=True)
    doctor_photo   = serializers.SerializerMethodField()
    patient_name    = serializers.CharField(source='patient.full_name', read_only=True)
    patient_phone   = serializers.CharField(source='patient.phone_number', read_only=True)
    last_message    = serializers.SerializerMethodField()
    unread_count    = serializers.SerializerMethodField()
    messages         = DoctorChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model  = DoctorConversation
        fields = [
            'id', 'doctor', 'doctor_name', 'doctor_photo', 'patient_name', 'patient_phone',
            'last_message', 'unread_count', 'messages', 'created_at',
        ]

    def get_doctor_photo(self, obj):
        request = self.context.get('request')
        if obj.doctor.photo and request:
            return request.build_absolute_uri(obj.doctor.photo.url)
        return None

    def get_last_message(self, obj):
        last = obj.messages.order_by('-created_at').first()
        return last.content if last else ''

    def get_unread_count(self, obj):
        viewer_role = self.context.get('viewer_role')
        if not viewer_role:
            return 0
        # پیام‌های خوانده‌نشده‌ای که طرف مقابل فرستاده (نه خودِ بیننده)
        other_sender = 'doctor' if viewer_role == 'patient' else 'patient'
        return obj.messages.filter(sender=other_sender, is_read=False).count()


class DoctorReviewSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model  = DoctorReview
        fields = ['id', 'patient_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['created_at']
