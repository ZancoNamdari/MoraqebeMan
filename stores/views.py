from decimal import Decimal
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from accounts.models import User
from .models import StoreCategory, Store, Product, Order, OrderItem
from .serializers import (
    StoreCategorySerializer, StoreListSerializer, StoreDetailSerializer,
    ProductSerializer, OrderSerializer,
)


# ══════════════════════════════════════
#  مرور عمومی فروشگاه‌ها
# ══════════════════════════════════════
class StoreCategoryListView(generics.ListAPIView):
    queryset           = StoreCategory.objects.all()
    serializer_class   = StoreCategorySerializer
    permission_classes = [AllowAny]


class StoreListView(generics.ListAPIView):
    """فهرست فروشگاه‌های فعال - برای نمایش در صفحه خرج اعتبار یا هر جای دیگر"""
    serializer_class   = StoreListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Store.objects.filter(status='active').order_by('-rating', '-created_at')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        return qs


class StoreDetailView(generics.RetrieveAPIView):
    """جزئیات یک فروشگاه به‌همراه محصولاتش - صفحه‌ای که مشتری‌های دیگر می‌بینند"""
    queryset           = Store.objects.filter(status='active')
    serializer_class   = StoreDetailSerializer
    permission_classes = [AllowAny]


# ══════════════════════════════════════
#  ثبت‌نام فروشگاه (مشابه ثبت‌نام مطب)
# ══════════════════════════════════════
class StoreRegisterView(APIView):
    """ثبت‌نام فروشگاه جدید. تصویر فروشگاه و تصویر کاور هر دو الزامی هستند
    (مشابه الزام تصویر مطب در ثبت‌نام ونداور)."""
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = []

    def post(self, request):
        phone         = request.data.get('phone_number')
        full_name      = request.data.get('full_name')
        store_name     = request.data.get('store_name')
        marketer_code  = request.data.get('marketer_code', '')
        category_id    = request.data.get('category_id')
        city           = request.data.get('city', '').strip()
        address        = request.data.get('address', '').strip()
        description    = request.data.get('description', '').strip()
        logo_image     = request.FILES.get('logo_image')
        cover_image    = request.FILES.get('cover_image')

        if not all([phone, full_name, store_name, city, address]):
            return Response({'error': 'اطلاعات ناقص است - نام، نام فروشگاه، شهر و آدرس الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        if not logo_image or not cover_image:
            return Response({'error': 'تصویر فروشگاه و تصویر کاور هر دو الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = StoreCategory.objects.filter(id=category_id).first()
            if not category:
                return Response({'error': 'نوع فروشگاه انتخاب‌شده معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)

        user, _ = User.objects.get_or_create(phone_number=phone)
        user.full_name = full_name
        user.save()

        marketer = None
        if marketer_code:
            marketer = User.objects.filter(referral_code=marketer_code, is_marketer=True).first()

        store = Store.objects.create(
            owner=user, name=store_name, status='pending',
            address=address, city=city, phone=phone,
            description=description,
            referred_by_marketer=marketer,
            category=category,
            logo_image=logo_image, cover_image=cover_image,
        )

        return Response({'message': 'درخواست ثبت‌نام فروشگاه شما ارسال شد.', 'user_id': user.id, 'store_id': store.id})


# ══════════════════════════════════════
#  پنل صاحب فروشگاه
# ══════════════════════════════════════
class MyStoreProfileView(generics.RetrieveUpdateAPIView):
    """صاحب فروشگاه - مشاهده/ویرایش پروفایل یکی از فروشگاه‌های خودش (با پارامتر store_id در URL).
    اگر store_id داده نشود، اولین فروشگاه او را برمی‌گرداند (سازگاری با نسخه تک‌فروشگاهی قبلی)."""
    serializer_class   = StoreDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        store_id = self.request.query_params.get('store_id') or self.kwargs.get('pk')
        qs = Store.objects.filter(owner=self.request.user)
        if store_id:
            return qs.get(id=store_id)
        return qs.first() or qs.get()


class MyStoresListView(generics.ListAPIView):
    """فهرست همه فروشگاه‌های خودِ صاحب فروشگاه"""
    serializer_class   = StoreDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Store.objects.filter(owner=self.request.user)


class AddStoreView(APIView):
    """صاحب فروشگاهِ از قبل ثبت‌نام‌کرده و لاگین‌شده، فروشگاه دیگری اضافه می‌کند - بدون نیاز به OTP دوباره"""
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        store_name   = request.data.get('store_name')
        category_id  = request.data.get('category_id')
        city         = request.data.get('city', '').strip()
        address      = request.data.get('address', '').strip()
        description  = request.data.get('description', '').strip()
        logo_image   = request.FILES.get('logo_image')
        cover_image  = request.FILES.get('cover_image')

        if not all([store_name, city, address]):
            return Response({'error': 'نام فروشگاه، شهر و آدرس الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)
        if not logo_image or not cover_image:
            return Response({'error': 'تصویر فروشگاه و تصویر کاور هر دو الزامی هستند'}, status=status.HTTP_400_BAD_REQUEST)

        category = None
        if category_id:
            category = StoreCategory.objects.filter(id=category_id).first()
            if not category:
                return Response({'error': 'نوع فروشگاه انتخاب‌شده معتبر نیست'}, status=status.HTTP_400_BAD_REQUEST)

        store = Store.objects.create(
            owner=request.user, name=store_name, status='pending',
            address=address, city=city, phone=request.user.phone_number,
            description=description, category=category,
            logo_image=logo_image, cover_image=cover_image,
        )
        return Response(StoreDetailSerializer(store, context={'request': request}).data, status=status.HTTP_201_CREATED)


class MyStoreProductsView(generics.ListCreateAPIView):
    """مدیریت محصولات فروشگاه‌های خودِ صاحب فروشگاه - با پارامتر store در بدنه POST مشخص می‌شود
    محصول به کدام فروشگاه اضافه شود؛ برای GET می‌توان با ?store=<id> فیلتر کرد"""
    serializer_class   = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Product.objects.filter(store__owner=self.request.user)
        store_id = self.request.query_params.get('store')
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs

    def perform_create(self, serializer):
        store_id = self.request.data.get('store_id') or self.request.data.get('store')
        qs = Store.objects.filter(owner=self.request.user)
        store = qs.filter(id=store_id).first() if store_id else qs.first()
        if not store:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'error': 'فروشگاه معتبری برای افزودن این محصول پیدا نشد'})
        serializer.save(store=store)


class MyStoreProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """ویرایش/حذف یک محصول - فقط توسط صاحب همان فروشگاه"""
    serializer_class   = ProductSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Product.objects.filter(store__owner=self.request.user)


class StoreOrdersView(generics.ListAPIView):
    """سفارش‌های دریافتی فروشگاه(های) خودِ صاحب فروشگاه - با ?store=<id> می‌توان به یک فروشگاه خاص فیلتر کرد"""
    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.filter(store__owner=self.request.user).select_related('customer', 'store').prefetch_related('items')
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        store_id = self.request.query_params.get('store')
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs


class StoreOrderActionView(APIView):
    """تأیید یا رد یک سفارش توسط صاحب فروشگاه - رد کردن باعث بازگشت کامل وجه می‌شود"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = Order.objects.filter(id=pk, store__owner=request.user).first()
        if not order:
            return Response({'error': 'سفارش پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if order.status != 'pending':
            return Response({'error': 'این سفارش قبلاً بررسی شده است'}, status=status.HTTP_400_BAD_REQUEST)

        action = request.data.get('action')
        if action not in ['confirm', 'reject']:
            return Response({'error': 'اکشن نامعتبر است'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        order.store_note = request.data.get('store_note', '')

        if action == 'confirm':
            order.status = 'confirmed'
        else:
            order.status = 'rejected'
            for item in order.items.all():
                if item.product:
                    item.product.stock += item.quantity
                    item.product.save(update_fields=['stock'])
            from .utils import refund_order
            refund_order(order)

        order.resolved_at = timezone.now()
        order.save()

        from accounts.notifications import notify
        if action == 'confirm':
            notify(order.customer, f'سفارش شما از {order.store.name} تأیید شد', '', type='general', link='/orders/')
        else:
            notify(order.customer, f'سفارش شما از {order.store.name} رد شد', 'مبلغ به کیف‌پولتان بازگشت داده شد', type='general', link='/orders/')

        return Response(OrderSerializer(order).data)


class StoreOrderCompleteView(APIView):
    """علامت‌گذاری یک سفارش تأییدشده به‌عنوان «تحویل داده شد»"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = Order.objects.filter(id=pk, store__owner=request.user, status='confirmed').first()
        if not order:
            return Response({'error': 'سفارش پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        order.status = 'completed'
        from django.utils import timezone
        order.resolved_at = timezone.now()
        order.save()
        return Response(OrderSerializer(order).data)


# ══════════════════════════════════════
#  سفارش‌گذاری توسط مشتری
# ══════════════════════════════════════
class CreateOrderView(APIView):
    """مشتری یک سفارش جدید ثبت می‌کند. بدنه درخواست:
    {"store": 1, "payment_method": "online", "note": "...", "address": "...",
     "items": [{"product": 5, "quantity": 2}, ...]}"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        store_id = request.data.get('store')
        items_data = request.data.get('items', [])
        payment_method = request.data.get('payment_method', 'online')

        store = Store.objects.filter(id=store_id, status='active').first()
        if not store:
            return Response({'error': 'فروشگاه پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if not items_data:
            return Response({'error': 'حداقل یک محصول باید انتخاب شود'}, status=status.HTTP_400_BAD_REQUEST)

        total = Decimal('0')
        resolved_items = []
        for item in items_data:
            product = Product.objects.filter(id=item.get('product'), store=store, is_active=True).first()
            if not product:
                return Response({'error': f'محصول با شناسه {item.get("product")} پیدا نشد یا فعال نیست'}, status=status.HTTP_400_BAD_REQUEST)
            quantity = int(item.get('quantity', 1))
            if quantity < 1:
                return Response({'error': 'تعداد باید حداقل ۱ باشد'}, status=status.HTTP_400_BAD_REQUEST)
            if product.stock < quantity:
                return Response({'error': f'موجودی «{product.name}» کافی نیست'}, status=status.HTTP_400_BAD_REQUEST)
            total += product.price * quantity
            resolved_items.append((product, quantity))

        order = Order.objects.create(
            customer=request.user, store=store, payment_method=payment_method,
            total_amount=total, note=request.data.get('note', ''), address=request.data.get('address', ''),
        )
        for product, quantity in resolved_items:
            OrderItem.objects.create(order=order, product=product, product_name=product.name, unit_price=product.price, quantity=quantity)
            product.stock -= quantity
            product.save(update_fields=['stock'])

        if payment_method == 'online':
            from .utils import charge_order
            success, message = charge_order(order, request.user)
            if not success:
                # موجودی کم بود - سفارش و کسر موجودی انبار برگردانده می‌شود
                for product, quantity in resolved_items:
                    product.stock += quantity
                    product.save(update_fields=['stock'])
                order.delete()
                return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        from accounts.notifications import notify
        notify(store.owner, f'سفارش جدید از {request.user.full_name or request.user.phone_number}', f'{len(resolved_items)} قلم کالا', type='general', link='/store-dashboard/')

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class MyOrdersView(generics.ListAPIView):
    """سفارش‌های خودِ مشتری"""
    serializer_class   = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related('store').prefetch_related('items')


class CancelOrderView(APIView):
    """لغو یک سفارش توسط مشتری - فقط تا وقتی تأیید فروشگاه نخورده - با بازگشت کامل وجه"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        order = Order.objects.filter(id=pk, customer=request.user).first()
        if not order:
            return Response({'error': 'سفارش پیدا نشد'}, status=status.HTTP_404_NOT_FOUND)
        if order.status != 'pending':
            return Response({'error': 'این سفارش دیگر قابل لغو نیست'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = 'cancelled'
        from django.utils import timezone
        order.resolved_at = timezone.now()
        order.save()

        for item in order.items.all():
            if item.product:
                item.product.stock += item.quantity
                item.product.save(update_fields=['stock'])

        from .utils import refund_order
        refund_order(order)

        from accounts.notifications import notify
        notify(order.store.owner, 'یک سفارش لغو شد', f'{request.user.full_name or request.user.phone_number}', type='general', link='/store-dashboard/')

        return Response({'message': 'سفارش لغو شد'})
