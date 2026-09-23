from rest_framework import serializers
from .models import User, MarketerProfile, MarketerConsultation, Notification, CommissionRequest


class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r'^09[0-9]{9}$',
        error_messages={'invalid': 'شماره موبایل معتبر نیست'}
    )


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    code         = serializers.CharField(max_length=6)


class UserProfileSerializer(serializers.ModelSerializer):
    """وضعیت واقعی فعال‌بودن پنل مطب (vendor_clinic_status) از روی خودِ Clinic خوانده می‌شود،
    نه صرفاً فلگ is_vendor - چون is_vendor ممکن است قبل از تأیید نهایی مطب هم True باشد.
    همین منطق برای فروشگاه (has_store/store_status) و صفحه پزشک (has_doctor_page/doctor_page_status) هم تکرار شده است."""
    vendor_clinic_status = serializers.SerializerMethodField()
    profile_picture_url   = serializers.SerializerMethodField()
    has_store             = serializers.SerializerMethodField()
    store_status          = serializers.SerializerMethodField()
    has_doctor_page        = serializers.SerializerMethodField()
    doctor_page_status     = serializers.SerializerMethodField()

    class Meta:
        model        = User
        fields       = ['id', 'phone_number', 'full_name', 'email', 'role',
                        'is_verified', 'referral_code', 'is_staff',
                        'is_vendor', 'is_marketer', 'vendor_clinic_status',
                        'has_store', 'store_status',
                        'has_doctor_page', 'doctor_page_status',
                        'profile_picture', 'profile_picture_url', 'birth_date', 'gender', 'city']
        read_only_fields = ['phone_number', 'role', 'is_verified', 'referral_code',
                            'is_staff', 'is_vendor', 'is_marketer']
        extra_kwargs = {'profile_picture': {'write_only': True, 'required': False}}

    def get_vendor_clinic_status(self, obj):
        clinic = obj.clinics.first()
        return clinic.status if clinic else None

    def get_has_store(self, obj):
        return obj.stores.exists()

    def get_store_status(self, obj):
        store = obj.stores.first()
        return store.status if store else None

    def get_has_doctor_page(self, obj):
        return hasattr(obj, 'doctor_profile')

    def get_doctor_page_status(self, obj):
        return obj.doctor_profile.status if hasattr(obj, 'doctor_profile') else None

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return obj.profile_picture.url if obj.profile_picture else None


class MarketerListSerializer(serializers.ModelSerializer):
    """لیست عمومی بازاریاب‌های قابل مشاوره - برای نمایش به کاربران عادی"""
    full_name  = serializers.CharField(source='marketer.full_name', read_only=True)
    marketer_id = serializers.IntegerField(source='marketer.id', read_only=True)

    class Meta:
        model  = MarketerProfile
        fields = ['marketer_id', 'full_name', 'specialty', 'bio']


class MarketerConsultationSerializer(serializers.ModelSerializer):
    marketer_name  = serializers.CharField(source='marketer.full_name', read_only=True)
    marketer_referral_code = serializers.CharField(source='marketer.referral_code', read_only=True)
    customer_name   = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone  = serializers.CharField(source='customer.phone_number', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = MarketerConsultation
        fields = [
            'id', 'marketer', 'marketer_name', 'marketer_referral_code', 'customer_name', 'customer_phone',
            'topic', 'message', 'status', 'status_display', 'reply',
            'created_at', 'replied_at',
        ]
        read_only_fields = ['status', 'reply', 'created_at', 'replied_at']


class NotificationSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model  = Notification
        fields = ['id', 'type', 'type_display', 'title', 'message', 'link', 'is_read', 'created_at']
        read_only_fields = ['type', 'title', 'message', 'link', 'created_at']

class CommissionRequestSerializer(serializers.ModelSerializer):
    requester_name  = serializers.CharField(source='requester.full_name', read_only=True)
    requester_phone = serializers.CharField(source='requester.phone_number', read_only=True)
    target_name     = serializers.CharField(source='target.full_name', read_only=True)
    target_phone    = serializers.CharField(source='target.phone_number', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = CommissionRequest
        fields = [
            'id', 'requester_name', 'requester_phone', 'target_name', 'target_phone',
            'target_code', 'status', 'status_display', 'created_at', 'resolved_at',
        ]
        read_only_fields = ['status', 'created_at', 'resolved_at']
