from rest_framework import generics, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from .models import Category, Clinic, Service, ServiceCategory, Portfolio, EducationalVideo, ClinicImage
from .serializers import (
    CategorySerializer,
    CategoryWithServiceOptionsSerializer,
    ServiceCategorySerializer,
    ClinicListSerializer,
    ClinicDetailSerializer,
    ClinicCreateSerializer,
    ServiceSerializer,
    PortfolioSerializer,
    EducationalVideoSerializer
)


class CategoryListView(generics.ListAPIView):
    """لیست همه دسته‌بندی‌ها"""
    queryset           = Category.objects.all()
    serializer_class   = CategorySerializer
    permission_classes = [AllowAny]


class CategoryServiceOptionsView(generics.RetrieveAPIView):
    """یک دسته‌بندی به‌همراه فهرست سرویس‌های استاندارد قابل انتخاب برای آن -
    برای نمایش در فرم ثبت مطب/انتخاب سرویس، بعد از اینکه ونداور نوع کسب‌وکار خود را انتخاب کرد."""
    queryset           = Category.objects.all()
    serializer_class   = CategoryWithServiceOptionsSerializer
    permission_classes = [AllowAny]


class AllServiceOptionsView(generics.ListAPIView):
    """فهرست همه سرویس‌های فعال، از تمام انواع کسب‌وکار، به‌صورت یکجا -
    برای نمایش به‌عنوان فیلتر سرویس در صفحه اصلی (به‌جای فیلتر بر اساس نوع کسب‌وکار).
    ترتیب بر اساس میزان استفاده واقعی (تعداد رزروهای ثبت‌شده برای این سرویس) - پرکاربردترین‌ها اول."""
    serializer_class   = ServiceCategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from django.db.models import Count
        return ServiceCategory.objects.filter(is_active=True).select_related('business_category').annotate(
            usage_count=Count('clinic_services__bookingrequest', distinct=True)
        ).order_by('-usage_count', 'order', 'name')


class ClinicPagination(PageNumberPagination):
    """صفحه‌بندی لیست مطب‌ها - برای صفحه اصلی (مطب‌های برتر) و هر جای دیگری که لیست مطب‌ها نمایش داده می‌شود"""
    page_size             = 10
    page_size_query_param  = 'page_size'
    max_page_size          = 50


class ClinicListView(generics.ListAPIView):
    """لیست مطب‌ها با قابلیت فیلتر، سرچ و صفحه‌بندی"""
    serializer_class   = ClinicListSerializer
    permission_classes = [AllowAny]
    pagination_class   = ClinicPagination
    filter_backends    = [filters.SearchFilter]
    search_fields      = ['name', 'city', 'address']

    def get_queryset(self):
        queryset = Clinic.objects.filter(status='active').order_by('-rating', '-created_at')

        # فیلتر بر اساس دسته‌بندی (نوع کسب‌وکار) - همچنان پشتیبانی می‌شود
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category__slug=category)

        # فیلتر بر اساس سرویس مشخص (مثلاً بوتاکس) - مطب‌هایی که این سرویس را فعال دارند
        service = self.request.query_params.get('service')
        if service:
            queryset = queryset.filter(services__category_id=service, services__is_active=True).distinct()

        # فیلتر بر اساس شهر
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city=city)

        return queryset


class ClinicDetailView(generics.RetrieveAPIView):
    """جزئیات یک مطب"""
    queryset           = Clinic.objects.filter(status='active')
    serializer_class   = ClinicDetailSerializer
    permission_classes = [AllowAny]


class ClinicCreateView(generics.CreateAPIView):
    """ثبت مطب جدید"""
    serializer_class   = ClinicCreateSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class MyClinicView(generics.ListAPIView):
    """مطب‌های من (صاحب مطب)"""
    serializer_class   = ClinicDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Clinic.objects.filter(owner=self.request.user)


class ClinicServicesView(generics.ListAPIView):
    """سرویس‌های یک مطب"""
    serializer_class   = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Service.objects.filter(
            clinic_id=self.kwargs['pk'],
            is_active=True
        )
    
class ClinicPortfolioView(generics.ListAPIView):
    """نمونه‌کارهای یک مطب"""
    serializer_class   = PortfolioSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Portfolio.objects.filter(
            clinic_id=self.kwargs['pk'],
            is_approved=True
        )


class ClinicEducationalVideosView(generics.ListAPIView):
    """ویدیوهای آموزشی یک مطب"""
    serializer_class   = EducationalVideoSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return EducationalVideo.objects.filter(clinic_id=self.kwargs['pk'])
    

class ExploreFeedView(generics.ListAPIView):
    """فید عمومی Explore - همه نمونه‌کارهای تأیید شده"""
    serializer_class   = PortfolioSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Portfolio.objects.filter(is_approved=True).select_related('clinic', 'service')

        media_type = self.request.query_params.get('type')
        if media_type:
            qs = qs.filter(media_type=media_type)

        service_slug = self.request.query_params.get('service')
        if service_slug:
            qs = qs.filter(service__name__icontains=service_slug)

        return qs.order_by('-is_featured', '-created_at')
    
class MyClinicProfileView(generics.RetrieveUpdateAPIView):
    """صاحب مطب - مشاهده/ویرایش پروفایل یکی از مطب‌های خودش (با پارامتر clinic_id در URL).
    اگر clinic_id داده نشود، اولین مطب او را برمی‌گرداند (سازگاری با نسخه قبلی که فقط یک مطب پشتیبانی می‌کرد)."""
    serializer_class   = ClinicDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        clinic_id = self.request.query_params.get('clinic_id') or self.kwargs.get('pk')
        qs = Clinic.objects.filter(owner=self.request.user)
        if clinic_id:
            return qs.get(id=clinic_id)
        return qs.first() or qs.get()  # .get() بدون نتیجه، خطای واضح DoesNotExist می‌دهد


class AddClinicView(APIView):
    """صاحب مطبِ از قبل ثبت‌نام‌کرده و لاگین‌شده، مطب دیگری اضافه می‌کند - بدون نیاز به OTP دوباره،
    چون قبلاً احراز هویت شده. برای ثبت‌نام اولین مطب همچنان از VendorRegisterView استفاده می‌شود."""
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        clinic_name  = request.data.get('clinic_name')
        category_id  = request.data.get('category_id')
        city         = request.data.get('city', '').strip()
        address      = request.data.get('address', '').strip()
        description  = request.data.get('description', '').strip()
        clinic_image = request.FILES.get('clinic_image')
        cover_image  = request.FILES.get('cover_image')

        if not all([clinic_name, city, address]):
            return Response({'error': 'نام مطب، شهر و آدرس الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        if not clinic_image or not cover_image:
            return Response({'error': 'تصویر مطب و تصویر کاور هر دو الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = Category.objects.filter(id=category_id).first()
            if not category:
                return Response({'error': 'نوع کسب‌وکار انتخاب‌شده معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.is_vendor = True
        request.user.save(update_fields=['is_vendor'])

        clinic = Clinic.objects.create(
            owner=request.user, name=clinic_name, status='pending',
            address=address, city=city, phone=request.user.phone_number,
            description=description, category=category,
        )
        ClinicImage.objects.create(clinic=clinic, image=clinic_image, is_cover=False)
        ClinicImage.objects.create(clinic=clinic, image=cover_image, is_cover=True)

        return Response(ClinicDetailSerializer(clinic).data, status=status.HTTP_201_CREATED)


class AddServiceView(generics.CreateAPIView):
    """افزودن یک سرویس - یا انتخاب‌شده از فهرست استاندارد (category) یا یک سرویس دلخواه.
    باید clinic_id در بدنه درخواست مشخص شود تا معلوم شود به کدام مطبِ این ونداور اضافه شود."""
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        clinic_id = self.request.data.get('clinic_id') or self.request.data.get('clinic')
        qs = Clinic.objects.filter(owner=self.request.user)
        clinic = qs.filter(id=clinic_id).first() if clinic_id else qs.first()
        if not clinic:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'مطب معتبری برای افزودن این سرویس پیدا نشد'})
        serializer.save(clinic=clinic)


class AddServicesBulkView(APIView):
    """انتخاب چندگانه سرویس از فهرست استاندارد (ServiceCategory) برای مطب خود ونداور.
    مثال بدنه درخواست: {"category_ids": [3, 5, 9]}
    برای هر شناسه، اگر سرویس مشابهی از قبل برای این مطب ثبت نشده باشد، یک Service جدید
    با نام همان ServiceCategory ساخته می‌شود (قیمت و مدت زمان پیش‌فرض صفر است و ونداور
    می‌تواند بعداً آن‌ها را ویرایش کند)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        category_ids = request.data.get('category_ids', [])
        if not isinstance(category_ids, list) or not category_ids:
            return Response(
                {'detail': 'category_ids باید یک لیست غیرخالی از شناسه‌های سرویس استاندارد باشد.'},
                status=400,
            )

        clinic_id = request.data.get('clinic_id') or request.data.get('clinic')
        qs = Clinic.objects.filter(owner=request.user)
        clinic = qs.filter(id=clinic_id).first() if clinic_id else qs.first()
        if not clinic:
            return Response({'detail': 'مطب معتبری برای افزودن این سرویس‌ها پیدا نشد.'}, status=400)

        options = ServiceCategory.objects.filter(
            id__in=category_ids,
            business_category=clinic.category,
            is_active=True,
        )

        created, skipped = [], []
        for option in options:
            service, was_created = Service.objects.get_or_create(
                clinic=clinic,
                category=option,
                defaults={'name': option.name, 'price': 0, 'duration': 0},
            )
            (created if was_created else skipped).append(ServiceSerializer(service).data)

        matched_ids = set(options.values_list('id', flat=True))
        invalid_ids = [cid for cid in category_ids if cid not in matched_ids]

        return Response({
            'created': created,
            'already_existing': skipped,
            'invalid_category_ids': invalid_ids,
        }, status=201 if created else 200)


class AddPortfolioView(generics.CreateAPIView):
    serializer_class   = PortfolioSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        clinic_id = self.request.data.get('clinic_id') or self.request.data.get('clinic')
        qs = Clinic.objects.filter(owner=self.request.user)
        clinic = qs.filter(id=clinic_id).first() if clinic_id else qs.first()
        if not clinic:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'مطب معتبری برای افزودن این نمونه‌کار پیدا نشد'})
        serializer.save(clinic=clinic, is_approved=False)  # نیاز به تایید ادمین