"""
پروفایل عمومیِ مراقب برای خانواده و بیمار (فقط‌خواندنی، شبیه پروفایل در
اسنپ/جاب‌ویژن): خانواده می‌تواند فهرست مراقبانِ تأییدشده را ببیند و از روی
پروفایل تصمیم بگیرد با او همکاری کند یا نه.

حریم خصوصی (عمداً سخت‌گیرانه): هیچ‌کدام از این‌ها هرگز در خروجی نیست —
شماره تلفن/نام کاربری، کد ملی، مدارک، آدرس و کد پستی، اطلاعات سلامت، حقوق درخواستی، معرف‌ها و
یادداشت‌های داخلی. عکس هم فقط وقتی نشان داده می‌شود که تأیید شده باشد.
"""
from django.db.models import Avg, Count, Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import choices as c
from .models import CaregiverProfile, CaregiverStatus
from .showcase import care_count, profile_photo_url, satisfaction_percent, special_talent_labels

PUBLIC_VIEWER_ROLES = ("family", "patient", "admin", "superuser")


def _labels(choice_cls):
    return dict(choice_cls.choices)


def _map(values, choice_cls):
    table = _labels(choice_cls)
    return [table[v] for v in (values or []) if v in table]


def _one(value, choice_cls):
    return _labels(choice_cls).get(value) or None


class CanViewPublicCaregiver(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role in PUBLIC_VIEWER_ROLES


def public_display_name(caregiver):
    """نام و نام خانوادگیِ کامل (به‌درخواست مالک پلتفرم). هرگز username
    (که شماره موبایل است) را برنمی‌گرداند."""
    user = caregiver.user
    full = f"{(user.first_name or '').strip()} {(user.last_name or '').strip()}".strip()
    return full or "مراقب"


def _approved_qs():
    return (
        CaregiverProfile.objects.filter(status=CaregiverStatus.APPROVED)
        .select_related("user", "user__caregiver_identity_profile", "user__caregiver_identity_profile__city", "user__caregiver_identity_profile__province")
    )


def _service_labels(caregiver):
    """نوع‌های خدمت به‌همراه زیرشاخه‌ها، با برچسب فارسی."""
    sub_tables = {}
    for cls in (
        c.NezafatchiSubtype, c.MadaryarSubtype, c.ParastarSubtype,
        c.ParastarSpecialty, c.BehyarLevel,
    ):
        sub_tables.update(_labels(cls))
    out = []
    for st in caregiver.service_types or []:
        subs = (caregiver.service_subtypes or {}).get(st) or []
        out.append({
            "key": st,
            "label": _one(st, c.ServiceType) or st,
            "subtypes": [sub_tables[s] for s in subs if s in sub_tables],
        })
    return out


def _rating(caregiver):
    agg = caregiver.reviews.aggregate(avg=Avg("rating"), n=Count("id"))
    return (round(agg["avg"], 1) if agg["avg"] is not None else None), agg["n"]


def _areas(caregiver):
    names = []
    for area in caregiver.service_areas.select_related("city", "district"):
        label = " - ".join(x for x in (
            getattr(area.city, "name", ""), getattr(area.district, "name", ""),
        ) if x)
        if label and label not in names:
            names.append(label)
    return names


# ویژگی‌های برجسته: به خانواده نتیجه‌ی کامل پرسشنامه نشان داده نمی‌شود، فقط
# عنوانِ ویژگی‌هایی که مراقب در آن‌ها بالاتر از متوسط (درصد بالا) بوده است.
HIGHLIGHT_MIN_PERCENT = 67
HIGHLIGHT_MAX = 8
HIGHLIGHT_TITLES = {
    "empathy": "مهربان و دلسوز", "kindness": "مهربان و گرم", "patience": "صبور و باحوصله",
    "calmness": "آرام و خونسرد در بحران", "gentleness": "ملایم و دقیق با نوزاد",
    "attentiveness": "دقیق و تیزبین", "observation": "تیزبین در پایش بیمار",
    "safety": "ایمنی‌محور و محتاط", "hygiene": "اهل بهداشت و نظافت",
    "foodHygiene": "رعایت‌کننده‌ی بهداشت غذا", "infectionControl": "دقیق در کنترل عفونت",
    "night_endurance": "پرتحمل در بیداری شبانه", "maternal_empathy": "همدل با مادر",
    "parent_respect": "محترم نسبت به انتخاب والدین", "adherence": "پایبند به دستورات مراقبتی",
    "followsInstructions": "پایبند به دستور پرستار", "instruction": "مجری دقیق خواسته‌ها",
    "communication": "اهل گزارش‌دهی و ارتباط روشن", "responsibility": "مسئولیت‌پذیر",
    "trustworthiness": "قابل اعتماد و امانت‌دار", "confidentiality": "رازدار",
    "privacy": "رازدار و محترم حریم خانه", "adaptability": "انعطاف‌پذیر", "flexibility": "انعطاف‌پذیر",
    "precision": "دقیق و جزئی‌نگر", "discipline": "منظم و مرتب", "organization": "منظم و سازمان‌یافته",
    "punctuality": "وقت‌شناس", "respect": "خوش‌برخورد و محترم", "politeness": "مؤدب و خوش‌رفتار",
    "independence": "مستقل و قابل اتکا", "stamina": "پرتوان در کار طولانی",
    "resilience": "مقاوم در شیفت‌های سخت", "speed": "سریع و اولویت‌بند",
    "grooming": "آراسته و مرتب", "hosting": "خوش‌پذیرایی", "protocol": "پایبند به ضوابط محیط کار",
    "janitor": "پیگیر و مسئول در سرایداری", "taste": "خوش‌سلیقه", "planning": "برنامه‌ریز و منظم‌کار",
    "kitchenOrder": "آشپزخانه را تمیز و منظم نگه می‌دارد", "economy": "صرفه‌جو و حسابگر",
    "dietCare": "مراقب رژیم و حساسیت‌های غذایی", "learning": "علاقه‌مند به یادگیری",
    "creativity": "خلاق", "clinicalJudgment": "تصمیم‌گیر درست در شرایط حساس",
    "medication": "دقیق در دارو و دستور پزشک", "dignity": "حافظ شأن و حریم بیمار",
    "education": "آموزش‌دهنده‌ی خوب به بیمار و خانواده", "scope": "آگاه به حدود وظایف",
    "teamwork": "همکار تیمی خوب", "dailyCare": "کارآمد در مراقبت روزمره",
    "physical": "جابه‌جایی ایمن و توان بدنی خوب", "companionship": "همدم و خوش‌صحبت",
    "firmness": "قاطع و مهربان", "cheerfulness": "شاداب و بانشاط",
}


def trait_highlights(profiles):
    """از trait_profiles ذخیره‌شده فقط عنوان ویژگی‌های بالای متوسط را برمی‌گرداند
    (بدون درصد و بدون نتیجه‌ی کامل)؛ تکراری‌ها ادغام و به ۸ مورد محدود می‌شوند."""
    best = {}
    for prof in profiles or []:
        for t in (prof or {}).get("traits") or []:
            try:
                pct = float(t.get("percent"))
            except (TypeError, ValueError):
                continue
            if pct < HIGHLIGHT_MIN_PERCENT:
                continue
            title = HIGHLIGHT_TITLES.get(t.get("key")) or (t.get("label") or "").strip()
            if title and pct > best.get(title, -1):
                best[title] = pct
    return [title for title, _ in sorted(best.items(), key=lambda kv: -kv[1])][:HIGHLIGHT_MAX]


_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def _relative_fa(created_at):
    """«امروز / ۳ روز قبل / ۸ ماه قبل / یک سال قبل» از روی تاریخ ثبت نظر."""
    from django.utils import timezone
    try:
        g = created_at.togregorian() if hasattr(created_at, "togregorian") else created_at
        if timezone.is_naive(g):
            g = timezone.make_aware(g)
        days = max((timezone.now() - g).days, 0)
    except Exception:
        return ""
    if days < 1:
        return "امروز"
    if days < 30:
        return f"{days} روز قبل".translate(_FA_DIGITS)
    if days < 365:
        return f"{days // 30} ماه قبل".translate(_FA_DIGITS)
    years = days // 365
    return "یک سال قبل" if years == 1 else f"{years} سال قبل".translate(_FA_DIGITS)


def _reviewer_name(user):
    if user is None:
        return "کاربر"
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    if not first and not last:
        return "کاربر"
    return f"{first} {last[:1]}." if last else first


def review_summary(caregiver, limit=30):
    """توزیع امتیازها (۱ تا ۵) + آخرین نظرهای دارای متن. فقط نام کوچک و حرف
    اول فامیلِ نظردهنده؛ هیچ اطلاعاتی از سالمند/بیمار نمایش داده نمی‌شود."""
    dist = {str(i): 0 for i in range(1, 6)}
    for row in caregiver.reviews.values("rating").annotate(n=Count("id")):
        dist[str(row["rating"])] = row["n"]
    rows = (
        caregiver.reviews.exclude(comment="").select_related("reviewer").order_by("-created_at")[:limit]
    )
    items = [
        {"id": r.id, "name": _reviewer_name(r.reviewer), "rating": r.rating,
         "comment": r.comment.strip(), "when": _relative_fa(r.created_at)}
        for r in rows
    ]
    return dist, items


def _trait_profiles(caregiver):
    q = getattr(caregiver, "compatibility_questionnaire", None)
    return list(q.trait_profiles or []) if q else []


def serialize_card(caregiver):
    identity = getattr(caregiver.user, "caregiver_identity_profile", None)
    avg, n = _rating(caregiver)
    return {
        "id": caregiver.user_id,
        "display_name": public_display_name(caregiver),
        "gender": identity.gender if identity else "",
        "age": identity.age if identity else None,
        "photo_url": profile_photo_url(caregiver),
        "city": getattr(getattr(identity, "city", None), "name", "") if identity else "",
        "services": _service_labels(caregiver),
        "avg_rating": avg,
        "review_count": n,
        "care_count": care_count(caregiver),
        "satisfaction_percent": satisfaction_percent(caregiver),
        "special_talents": special_talent_labels(caregiver),
        "elderly_experience": _one(
            getattr(getattr(caregiver, "experience", None), "elderly_care_experience", ""), c.ExperienceRange,
        ),
        "serves_all_areas": caregiver.serves_all_areas,
    }


def serialize_profile(caregiver):
    data = serialize_card(caregiver)
    exp = getattr(caregiver, "experience", None)
    skills = getattr(caregiver, "skills", None)
    prefs = getattr(caregiver, "work_preferences", None)
    identity = getattr(caregiver.user, "caregiver_identity_profile", None)

    data["about"] = {
        "gender": _one(identity.gender, c.Gender) if identity else None,
        "marital_status": _one(identity.marital_status, c.MaritalStatus) if identity else None,
        "children_count": _one(identity.children_count, c.ChildrenCount) if identity else None,
        "ethnicities": _map(identity.ethnicities, c.Ethnicity) if identity else [],
        "province": getattr(getattr(identity, "province", None), "name", "") if identity else "",
    }
    data["areas"] = _areas(caregiver)
    data["experience"] = {
        "elderly_care": _one(exp.elderly_care_experience, c.ExperienceRange) if exp else None,
        "other_services": _one(exp.other_services_experience, c.ExperienceRange) if exp else None,
        "patients_cared_for": _one(exp.patients_cared_for_count, c.PatientsCaredForCount) if exp else None,
        "previous_workplaces": _map(exp.previous_workplaces, c.PreviousWorkplace) if exp else [],
        "special_conditions": [
            x for x in _map(exp.special_conditions_experience, c.SpecialConditionExperience) if x != "هیچ‌کدام"
        ] if exp else [],
        "live_in": bool(exp and exp.live_in_experience),
        "couple_care": bool(exp and exp.couple_care_experience),
        "solo_elderly_care": bool(exp and exp.solo_elderly_care_experience),
    }
    data["skills"] = {
        "education": _one(skills.education_level, c.EducationLevel) if skills else None,
        "field_of_study": (skills.field_of_study or "").strip() if skills else "",
        "training_courses": _map(skills.training_courses, c.TrainingCourse) if skills else [],
        "caregiving": _map(skills.caregiving_skills, c.CaregivingSkill) if skills else [],
        "communication": _map(skills.communication_skills, c.CommunicationSkill) if skills else [],
        "household": _map(skills.household_skills, c.HouseholdSkill) if skills else [],
        "mobility": _map(skills.mobility_assistance_ability, c.MobilityAssistanceAbility) if skills else [],
        "foreign_languages": _map(skills.foreign_languages, c.ForeignLanguage) if skills else [],
        "local_languages": _map(skills.local_languages, c.LocalLanguage) if skills else [],
        "driving_license": bool(skills and skills.has_driving_license),
    }
    data["availability"] = {
        "collaboration_types": _map(prefs.collaboration_types, c.CollaborationType) if prefs else [],
        "days": _map(prefs.available_days, c.Weekday) if prefs else [],
        "shifts": _map(prefs.available_shifts, c.Shift) if prefs else [],
        "overnight_stay": prefs.overnight_stay_ok if prefs else None,
        "holiday_work": prefs.holiday_work_ok if prefs else None,
    }
    data["highlights"] = trait_highlights(_trait_profiles(caregiver))
    data["rating_distribution"], data["reviews"] = review_summary(caregiver)
    return data


class PublicCaregiverListView(APIView):
    """GET /api/caregivers/public/?service_type=&gender=&q=&page= — فهرست
    مراقبانِ تأییدشده. جستجوی q روی نام کوچک/خانوادگی، شهر و منطقه."""
    permission_classes = [CanViewPublicCaregiver]
    PAGE_SIZE = 20

    def get(self, request):
        qs = _approved_qs()
        st = request.query_params.get("service_type")
        gender = request.query_params.get("gender")
        if gender in ("female", "male"):
            qs = qs.filter(user__caregiver_identity_profile__gender=gender)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(user__first_name__icontains=q) | Q(user__last_name__icontains=q)
                | Q(user__caregiver_identity_profile__city__name__icontains=q)
                | Q(service_areas__city__name__icontains=q)
                | Q(service_areas__district__name__icontains=q)
            ).distinct()
        qs = qs.order_by("-approved_at", "-id")
        if st:
            # فیلتر JSON در پایتون تا روی هر دیتابیسی (postgres/sqlite) یکسان کار کند.
            qs = [cg for cg in qs if st in (cg.service_types or [])]
            total = len(qs)
        else:
            total = qs.count()
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        start = (page - 1) * self.PAGE_SIZE
        rows = [serialize_card(cg) for cg in qs[start:start + self.PAGE_SIZE]]
        return Response({"count": total, "page": page, "page_size": self.PAGE_SIZE, "results": rows})


class PublicCaregiverDetailView(APIView):
    """GET /api/caregivers/public/<user_id>/ — پروفایل کامل (بدون اطلاعات
    تماس/هویتی). مراقبِ تأییدنشده 404 می‌دهد، نه 403، تا وجودش لو نرود."""
    permission_classes = [CanViewPublicCaregiver]

    def get(self, request, user_id):
        caregiver = _approved_qs().filter(user_id=user_id).first()
        if caregiver is None:
            return Response({"detail": "مراقب یافت نشد."}, status=404)
        return Response(serialize_profile(caregiver))


class CaregiverFamilyViewPreviewView(APIView):
    """GET /api/caregivers/<user_id>/family-view/ — همان پروفایلی که خانواده/بیمار
    می‌بیند، اما برای کارمند آژانس/ادمین (پیش‌نمایش، با هر وضعیتی از مراقب —
    حتی هنوز تأییدنشده، تا آژانس قبل از انتشار ببیند خانواده چه می‌بیند).
    دسترسی همان قاعده‌ی بررسی مدارک: ادمین پلتفرم یا آژانسِ صاحب همین مراقب."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        from apps.agencies.tenancy import can_review_caregiver_document
        caregiver = (
            CaregiverProfile.objects.filter(user_id=user_id)
            .select_related("user", "user__caregiver_identity_profile", "user__caregiver_identity_profile__city", "user__caregiver_identity_profile__province")
            .first()
        )
        if caregiver is None or not can_review_caregiver_document(request.user, caregiver):
            return Response({"detail": "مراقب یافت نشد."}, status=404)
        data = serialize_profile(caregiver)
        data["status"] = caregiver.status
        # پیش‌نمایش: عکس در انتظار تأیید هم دیده شود، با نشانگر وضعیت.
        from .models import CaregiverDocumentType, CaregiverDocumentUpload
        up = CaregiverDocumentUpload.objects.filter(
            caregiver=caregiver, document_type=CaregiverDocumentType.PERSONAL_PHOTO,
        ).first()
        data["photo_status"] = up.status if up else None
        if up and up.file and not data["photo_url"]:
            data["photo_url"] = up.file.url
        return Response(data)
