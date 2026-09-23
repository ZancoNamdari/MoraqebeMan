from rest_framework import serializers

from accounts.models import User
from clinics.models import Clinic, Category, ServiceCategory, Service
from bookings.models import BookingRequest
from consultations.models import Consultation
from redemption.models import RedemptionPartner, RedemptionRequest
from payments.models import MarketerCommission
from stores.models import Store
from doctors.models import Doctor


class AdminClinicListSerializer(serializers.ModelSerializer):
    """برای جدول لیست مطب‌ها - فقط فیلدهای لازم برای نمایش در جدول"""
    owner_phone     = serializers.CharField(source='owner.phone_number', read_only=True)
    owner_name      = serializers.CharField(source='owner.full_name', read_only=True)
    category_name   = serializers.CharField(source='category.name', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    is_complete     = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = [
            'id', 'name', 'owner_phone', 'owner_name', 'category_name', 'city', 'address',
            'status', 'status_display', 'rating', 'created_at', 'is_complete',
        ]

    def get_is_complete(self, obj):
        return bool(obj.address and obj.city)


class AdminClinicCreateSerializer(serializers.ModelSerializer):
    """ایجاد مطب جدید توسط ادمین. مالک با شماره موبایل مشخص می‌شود؛
    اگر کاربری با آن شماره وجود نداشته باشد، به‌صورت خودکار ساخته می‌شود."""
    owner_phone = serializers.CharField(write_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', required=False, allow_null=True
    )

    class Meta:
        model  = Clinic
        fields = ['id', 'owner_phone', 'category_id', 'name', 'description', 'city', 'address', 'phone', 'status']

    def validate_owner_phone(self, value):
        if not value.strip():
            raise serializers.ValidationError('شماره موبایل مالک الزامی است')
        return value.strip()

    def create(self, validated_data):
        phone = validated_data.pop('owner_phone')
        owner, _ = User.objects.get_or_create(phone_number=phone)
        validated_data.setdefault('status', 'pending')
        return Clinic.objects.create(owner=owner, **validated_data)


class AdminClinicDetailSerializer(serializers.ModelSerializer):
    """برای صفحه جزئیات یک مطب - قابل ویرایش توسط ادمین"""
    owner_phone   = serializers.CharField(source='owner.phone_number', read_only=True)
    owner_name    = serializers.CharField(source='owner.full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_id   = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Clinic
        fields = [
            'id', 'name', 'owner_phone', 'owner_name', 'category_name', 'category_id',
            'description', 'city', 'address', 'phone', 'lat', 'lng',
            'status', 'status_display', 'rating', 'commission_percent', 'created_at',
        ]
        read_only_fields = ['owner_phone', 'owner_name', 'category_name', 'status_display', 'rating', 'created_at']


class AdminCategorySerializer(serializers.ModelSerializer):
    service_options_count = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon', 'service_options_count']

    def get_service_options_count(self, obj):
        return obj.service_options.count()


class AdminServiceCategorySerializer(serializers.ModelSerializer):
    business_category_name = serializers.CharField(source='business_category.name', read_only=True)

    class Meta:
        model  = ServiceCategory
        fields = ['id', 'business_category', 'business_category_name', 'name', 'is_active', 'order']


class AdminServiceSerializer(serializers.ModelSerializer):
    """سرویس واقعی یک مطب (نه سرویس استاندارد الگو) - قابل مدیریت کامل توسط ادمین"""
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model  = Service
        fields = ['id', 'clinic', 'clinic_name', 'category', 'name', 'description', 'price', 'duration', 'is_active']


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            'id', 'phone_number', 'full_name', 'email', 'role',
            'is_vendor', 'is_marketer', 'is_staff', 'is_active', 'is_verified',
            'referral_code', 'created_at',
        ]
        read_only_fields = ['phone_number', 'role', 'referral_code', 'created_at', 'is_verified']


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """ایجاد کاربر جدید توسط ادمین - عمدتاً برای افزودن ادمین‌های جدید به پنل مدیریت.
    ورود همچنان از طریق شماره موبایل + کد تأیید (مثل بقیه کاربران) انجام می‌شود، رمز عبوری تنظیم نمی‌شود."""
    phone_number = serializers.CharField(validators=[])  # اعتبارسنجی یکتا بودن به‌صورت دستی و با پیام فارسی انجام می‌شود

    class Meta:
        model  = User
        fields = ['id', 'phone_number', 'full_name', 'email', 'is_vendor', 'is_marketer', 'is_staff']

    def validate_phone_number(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('شماره موبایل الزامی است')
        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('کاربری با این شماره موبایل قبلاً ثبت شده - از بخش لیست کاربران نقش او را ویرایش کنید')
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class AdminBookingSerializer(serializers.ModelSerializer):
    customer_name  = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True)
    clinic_name    = serializers.CharField(source='clinic.name', read_only=True)
    service_name   = serializers.CharField(source='service.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = BookingRequest
        fields = [
            'id', 'customer_name', 'customer_phone', 'clinic_name', 'service_name',
            'requested_date', 'requested_time', 'status', 'status_display', 'is_paid',
            'payment_method', 'clinic_note', 'confirmed_time', 'created_at',
        ]


class AdminConsultationSerializer(serializers.ModelSerializer):
    customer_name  = serializers.CharField(source='customer.full_name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone_number', read_only=True)
    clinic_name    = serializers.CharField(source='clinic.name', read_only=True)
    service_name   = serializers.CharField(source='service.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Consultation
        fields = [
            'id', 'customer_name', 'customer_phone', 'clinic_name', 'service_name',
            'status', 'status_display', 'preferred_dates', 'description',
            'clinic_note', 'visit_date', 'surgery_date', 'created_at',
        ]


class AdminRedemptionPartnerSerializer(serializers.ModelSerializer):
    """مدیریت کامل سرویس‌دهندگان خرج اعتبار، شامل تنظیم کارمزد پلتفرم (قابل تغییر)"""
    commission_type_display = serializers.CharField(source='get_commission_type_display', read_only=True)

    class Meta:
        model  = RedemptionPartner
        fields = [
            'id', 'name', 'icon', 'description', 'is_active', 'order',
            'commission_type', 'commission_type_display', 'commission_value',
        ]

    def validate_commission_value(self, value):
        if value < 0:
            raise serializers.ValidationError('کارمزد نمی‌تواند منفی باشد')
        return value

    def validate(self, attrs):
        commission_type = attrs.get('commission_type', getattr(self.instance, 'commission_type', 'percentage'))
        commission_value = attrs.get('commission_value', getattr(self.instance, 'commission_value', 0))
        if commission_type == 'percentage' and commission_value > 100:
            raise serializers.ValidationError({'commission_value': 'درصد کارمزد نمی‌تواند بیشتر از ۱۰۰ باشد'})
        return attrs


class AdminRedemptionRequestSerializer(serializers.ModelSerializer):
    user_phone      = serializers.CharField(source='user.phone_number', read_only=True)
    user_name       = serializers.CharField(source='user.full_name', read_only=True)
    partner_name    = serializers.CharField(source='partner.name', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = RedemptionRequest
        fields = [
            'id', 'user_phone', 'user_name', 'partner', 'partner_name',
            'description', 'requested_amount', 'status', 'status_display',
            'final_amount', 'commission_amount', 'cashback_amount', 'admin_note', 'voucher_file', 'created_at', 'resolved_at',
        ]
        read_only_fields = ['user_phone', 'user_name', 'partner_name', 'status', 'commission_amount', 'cashback_amount', 'created_at', 'resolved_at']


class AdminMarketerCommissionSerializer(serializers.ModelSerializer):
    """نرخ کمیسیون یک بازاریاب مشخص - قابل تغییر توسط ادمین"""
    marketer_name  = serializers.CharField(source='marketer.full_name', read_only=True)
    marketer_phone = serializers.CharField(source='marketer.phone_number', read_only=True)

    class Meta:
        model  = MarketerCommission
        fields = ['id', 'marketer', 'marketer_name', 'marketer_phone', 'customer_commission_percent', 'clinic_commission_percent', 'is_active']
        read_only_fields = ['marketer']


class AdminStoreListSerializer(serializers.ModelSerializer):
    owner_phone     = serializers.CharField(source='owner.phone_number', read_only=True)
    owner_name      = serializers.CharField(source='owner.full_name', read_only=True)
    category_name   = serializers.CharField(source='category.name', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    is_complete     = serializers.SerializerMethodField()

    class Meta:
        model  = Store
        fields = [
            'id', 'name', 'owner_phone', 'owner_name', 'category_name', 'city', 'address',
            'status', 'status_display', 'rating', 'created_at', 'is_complete',
        ]

    def get_is_complete(self, obj):
        return bool(obj.address and obj.city and obj.logo_image and obj.cover_image)


class AdminStoreDetailSerializer(serializers.ModelSerializer):
    owner_phone   = serializers.CharField(source='owner.phone_number', read_only=True)
    owner_name    = serializers.CharField(source='owner.full_name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Store
        fields = [
            'id', 'name', 'owner_phone', 'owner_name', 'category', 'category_name',
            'description', 'city', 'address', 'phone',
            'status', 'status_display', 'rating', 'commission_percent', 'created_at',
        ]
        read_only_fields = ['owner_phone', 'owner_name', 'category_name', 'status_display', 'rating', 'created_at']


class AdminDoctorListSerializer(serializers.ModelSerializer):
    owner_phone    = serializers.CharField(source='owner.phone_number', read_only=True)
    clinic_name    = serializers.CharField(source='clinic.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_complete     = serializers.SerializerMethodField()

    class Meta:
        model  = Doctor
        fields = [
            'id', 'full_name', 'owner_phone', 'clinic_name', 'city',
            'status', 'status_display', 'rating', 'created_at', 'is_complete',
        ]

    def get_is_complete(self, obj):
        return bool(obj.address and obj.city and obj.photo)


class AdminDoctorDetailSerializer(serializers.ModelSerializer):
    owner_phone    = serializers.CharField(source='owner.phone_number', read_only=True)
    clinic_name    = serializers.CharField(source='clinic.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Doctor
        fields = [
            'id', 'full_name', 'owner_phone', 'clinic', 'clinic_name', 'medical_license_no',
            'specialty', 'bio', 'address', 'city', 'phone', 'instagram', 'rubika', 'bale',
            'status', 'status_display', 'rating', 'created_at',
        ]
        read_only_fields = ['owner_phone', 'clinic_name', 'status_display', 'rating', 'created_at']
