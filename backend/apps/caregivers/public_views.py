"""
پروفایل عمومیِ مراقب برای خانواده و بیمار (فقط‌خواندنی، شبیه پروفایل در
اسنپ/جاب‌ویژن): خانواده می‌تواند فهرست مراقبانِ تأییدشده را ببیند و از روی
پروفایل تصمیم بگیرد با او همکاری کند یا نه.

حریم خصوصی (عمداً سخت‌گیرانه): هیچ‌کدام از این‌ها هرگز در خروجی نیست —
شماره تلفن/نام کاربری، کد ملی، مدارک، آدرس و کد پستی، نام کامل (فقط نام
کوچک + حرف اول نام خانوادگی)، اطلاعات سلامت، حقوق درخواستی، معرف‌ها و
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
    """نام کوچک + حرف اول نام خانوادگی. هرگز username (که شماره موبایل است)
    را برنمی‌گرداند."""
    user = caregiver.user
    first = (user.first_name or "").strip()
    last = (user.last_name or "").strip()
    if not first and not last:
        return "مراقب"
    return f"{first} {last[:1]}." if last else first


def _approved_qs():
    return (
        CaregiverProfile.objects.filter(status=CaregiverStatus.APPROVED)
        .select_related("user", "user__caregiver_identity_profile", "user__caregiver_identity_profile__city")
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
        "marital_status": _one(identity.marital_status, c.MaritalStatus) if identity else None,
        "ethnicities": _map(identity.ethnicities, c.Ethnicity) if identity else [],
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
    data["trait_profiles"] = _trait_profiles(caregiver)
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
