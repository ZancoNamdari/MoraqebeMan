from rest_framework import serializers
from .models import Category, Clinic, ClinicImage, Service, ServiceCategory, WorkSchedule,Doctor,Portfolio,EducationalVideo


class ServiceCategorySerializer(serializers.ModelSerializer):
    """یک سرویس استاندارد قابل انتخاب برای یک نوع کسب‌وکار مشخص"""
    class Meta:
        model  = ServiceCategory
        fields = ['id', 'name', 'is_active', 'order']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon']


class CategoryWithServiceOptionsSerializer(serializers.ModelSerializer):
    """دسته‌بندی کسب‌وکار به‌همراه فهرست سرویس‌های استاندارد قابل انتخاب برای آن -
    مورد استفاده در فرم ثبت مطب/انتخاب سرویس توسط ونداور"""
    service_options = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon', 'service_options']

    def get_service_options(self, obj):
        options = obj.service_options.filter(is_active=True)
        return ServiceCategorySerializer(options, many=True).data


class ClinicImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ClinicImage
        fields = ['id', 'image', 'is_cover']


class WorkScheduleSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source='get_day_display', read_only=True)

    class Meta:
        model  = WorkSchedule
        fields = ['id', 'day', 'day_name', 'open_time', 'close_time', 'is_closed']


class ServiceSerializer(serializers.ModelSerializer):
    category      = serializers.PrimaryKeyRelatedField(
        queryset=ServiceCategory.objects.all(), required=False, allow_null=True
    )
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model  = Service
        fields = ['id', 'category', 'category_name', 'name', 'description', 'price', 'duration', 'is_active']

    def validate(self, attrs):
        """اگر سرویس از فهرست استاندارد انتخاب شده و نامی داده نشده، نام همان دسته را قرار بده"""
        category = attrs.get('category')
        if category and not attrs.get('name'):
            attrs['name'] = category.name
        return attrs


class ClinicListSerializer(serializers.ModelSerializer):
    """برای لیست مطب‌ها - اطلاعات کمتر"""
    category   = CategorySerializer(read_only=True)
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = ['id', 'name', 'city', 'address', 'category', 'rating', 'phone', 'cover_image']

    def get_cover_image(self, obj):
        cover = obj.images.filter(is_cover=True).first()
        if cover:
            request = self.context.get('request')
            return request.build_absolute_uri(cover.image.url)
        return None


class ClinicCreateSerializer(serializers.ModelSerializer):
    """برای ثبت مطب جدید توسط صاحب مطب"""
    class Meta:
        model  = Clinic
        fields = ['name', 'description', 'address', 'city', 'lat', 'lng', 'phone', 'category']

class DoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Doctor
        fields = ['id', 'full_name', 'specialty', 'medical_license_no', 'bio', 'photo', 'years_experience']


class EducationalVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EducationalVideo
        fields = ['id', 'title', 'description', 'video', 'tag', 'created_at']


class ClinicDetailSerializer(serializers.ModelSerializer):
    """برای صفحه جزئیات مطب (مشتری) و پروفایل ونداور - اطلاعات کامل"""
    category           = CategorySerializer(read_only=True)
    category_id         = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True,
        required=False, allow_null=True
    )
    images              = ClinicImageSerializer(many=True, read_only=True)
    services             = ServiceSerializer(many=True, read_only=True)
    schedule             = WorkScheduleSerializer(many=True, read_only=True)
    doctors              = DoctorSerializer(many=True, read_only=True)
    portfolio_items       = serializers.SerializerMethodField()
    educational_videos    = EducationalVideoSerializer(many=True, read_only=True)
    cover_image           = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = [
            'id', 'name', 'description', 'city', 'address', 'status',
            'lat', 'lng', 'phone', 'category', 'category_id', 'rating',
            'images', 'services', 'schedule', 'doctors', 'cover_image',
            'portfolio_items', 'educational_videos',
        ]
        read_only_fields = ['status', 'rating']

    def get_portfolio_items(self, obj):
        items = obj.portfolio_items.filter(is_approved=True)
        return PortfolioSerializer(items, many=True, context=self.context).data

    def get_cover_image(self, obj):
        cover = obj.images.filter(is_cover=True).first()
        request = self.context.get("request")
        if cover and request:
            return request.build_absolute_uri(cover.image.url)
        return None
    

class PortfolioSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    clinic_id     = serializers.IntegerField(source='clinic.id', read_only=True)
    clinic_name   = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model  = Portfolio
        fields = ['id', 'media_type', 'before_image', 'after_image', 'video', 'thumbnail',
                  'caption', 'service_name', 'clinic_id', 'clinic_name',
                  'views_count', 'likes_count', 'created_at']