"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf import settings
from django.conf.urls.static import static
from core.views import consult_view, consultations_view, vendor_view, BannerListView
from django.contrib import admin

admin.site.site_header  = 'پنل مدیریت زیباپلاس'
admin.site.site_title   = 'زیباپلاس'
admin.site.index_title  = 'داشبورد مدیریت'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('clinics.urls')),
    path('api/', include('bookings.urls')),
    path('api/', include('payments.urls')),
    path('api/', include('stores.urls')),
    path('api/', include('doctors.urls')),
    path('api/consultations/',include('consultations.urls')),
    path('api/', include('redemption.urls')),
    path('api/admin-panel/', include('adminpanel.urls')),
    path('api/banners/', BannerListView.as_view()),
    path('', include('core.urls')),
    path('consult/', consult_view, name='consult'),
    path('consultations/', consultations_view, name='consultations'),
    path('vendor/', vendor_view),
    path('api/', include('support.urls')),

    # صریحاً فایل‌های media (عکس/ویدیوی آپلودشده) را سرو می‌کند - چه DEBUG روشن باشد چه خاموش.
    # تابع static() جنگو فقط وقتی DEBUG=True باشد این مسیر را اضافه می‌کند؛ یعنی با DEBUG=False
    # (حالت عادی در دیپلوی واقعی) هیچ عکس/ویدیوی آپلودشده‌ای اصلاً نمایش داده نمی‌شد.
    # نکته برای مقیاس بزرگ‌تر در آینده: اگر ترافیک زیاد شد، بهتر است media از طریق nginx یا
    # یک Object Storage (مثل S3) سرو شود، نه مستقیم از خود جنگو.
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)