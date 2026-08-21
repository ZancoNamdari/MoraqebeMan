# مراقب من (Moraqeb-e Man)

پلتفرم واسط بین خانواده سالمند، بیمار، و مراقب — مدل کسب‌وکار B2B (فروش به آژانس‌های مراقبتی).

## معماری

فاز ۱: **مونولیت ماژولار** (نه میکروسرویس) — یک پروژه جنگو واحد در `backend/`، به‌دلیل هزینه عملیاتی پایین‌تر برای فاز راه‌اندازی استارتاپ. مسیر مهاجرت تدریجی به میکروسرویس در فازهای بعدی مستند شده.

پشته فنی: Django + DRF + PostgreSQL + Redis (کش و Celery broker) + Celery + Docker + Nginx. فرانت‌اند: React + Next.js (mobile-first، PWA).

## ساختار ریپازیتوری

```
moraqebeman/
├── backend/          # پروژه جنگو (مونولیت) — همه منطق سرور
│   └── apps/
│       ├── accounts/        # هویت، شش نقش (SUPERUSER/ADMIN/AGENCY/FAMILY/PATIENT/CAREGIVER)
│       ├── authentication/  # ثبت‌نام، ورود، JWT، OTP، بازیابی رمز
│       ├── authorization/   # تغییر نقش (فقط SUPERUSER)
│       ├── audit/           # ثبت رویدادهای امنیتی
│       └── families/        # پروفایل خانواده، پروفایل بیمار (۲ تب)، پرسشنامه سازگاری
├── frontend/         # (برنامه‌ریزی‌شده — Next.js، هنوز ساخته نشده)
├── gateway/          # پیکربندی Nginx
└── docker-compose.yml
```

## مستندات تکمیلی

- [`docs/MATCHING.md`](docs/MATCHING.md) — سیستم تطابق مراقب و بیمار: معماری، هر دو پرسشنامه سازگاری به‌طور کامل، فرمول امتیازدهی، مرجع API، و محدودیت‌های شناخته‌شده.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — راهنمای کامل استقرار پروداکشن: چه چیزهایی لازم دارید (سرور، دامنه، حساب کاوه‌نگار)، تنظیم DNS، Docker Compose، SSL، و عملیات پس از استقرار.

## اجرا

```bash
cp .env.example .env   # در صورت نیاز، مقادیر واقعی را جایگزین کنید
docker compose up --build
```

- بک‌اند: `http://localhost:8000`
- مستندات API (خودکار، از drf-spectacular): `http://localhost:8000/api/docs/`
- بررسی سلامت: `http://localhost:8000/health/`

ساخت اولین حساب مدیر:
```bash
docker compose exec backend python manage.py create_admin
```
(نام کاربری/رمز پیش‌فرض: `admin` / `Admin@12345` — با `--username`/`--password` قابل تغییر)

## تست

```bash
docker compose exec backend python manage.py test tests
```
۶۰ تست خودکار، شامل احراز هویت، OTP، بازیابی رمز، تغییر نقش، و پروفایل خانواده/بیمار.

## وضعیت فعلی

| وضعیت | ماژول |
|---|---|
| ✅ کامل، تست‌شده | accounts, authentication, authorization, audit, families |
| ⏳ فقط طراحی‌شده | agencies, caregivers, matching, search, booking, messaging, reviews, notifications, finance, analytics, content |
| ⏳ ساخته نشده | frontend (Next.js) |

جزئیات کامل معماری، فازبندی، و فرم‌های ثبت‌نام در سند معماری پروژه (خارج از این ریپازیتوری) آمده است.
