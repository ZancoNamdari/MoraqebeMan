"""
The first real implementation of what was always meant to be a
"matching_service" — the compatibility questionnaire has existed on
PatientProfile since early in this project, but nothing ever actually
consumed it to suggest a caregiver. This is a deliberately simple,
transparent v1: score caregivers against objective, already-captured
signals (gender preference, age-range preference, service-area
overlap), not the subjective 12-axis questionnaire, which has no
caregiver-side counterpart to compare against yet (it captures the
PATIENT's preferences about how a caregiver should behave, not
anything about the caregiver themselves) — scoring against it would
mean inventing a fictional mapping, not a real comparison. Extending
this to the questionnaire is a natural next step once caregivers have
an equivalent set of answers to compare against.
"""
import datetime

from apps.caregivers.choices import AcceptedGender
from apps.caregivers.models import CaregiverProfile, CaregiverStatus


def _patient_age(patient) -> int | None:
    if patient.birth_date is None:
        return None
    born = patient.birth_date
    # django_jalali's jDateField returns a plain datetime.date for an
    # in-memory, just-created instance, but a real jdatetime.date once
    # the object has actually round-tripped through the database (any
    # real API request). Mixing the two in date arithmetic doesn't
    # error — it silently produces a nonsense result (a Jalali year
    # like 1328 subtracted from a Gregorian year like 2026 gives an
    # "age" in the hundreds), which is worse than a crash. Normalize
    # explicitly rather than assume either type.
    if hasattr(born, "togregorian"):
        born = born.togregorian()
    today = datetime.date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def _age_bracket(age: int) -> str | None:
    if age < 60:
        return None
    if age <= 70:
        return "60_70"
    if age <= 80:
        return "70_80"
    return "over_80"


def score_caregiver_for_patient(caregiver: CaregiverProfile, patient) -> dict:
    """Returns a score (0-100) and a plain-language breakdown of why —
    a supervisor should be able to see WHY a caregiver was ranked
    where they were, not just trust an opaque number."""
    score = 0
    reasons = []

    work_prefs = getattr(caregiver, "work_preferences", None)

    # Gender preference (40 points) — a real, commonly-cited comfort
    # factor in in-home elder care, and already captured on both sides.
    if patient.gender and work_prefs and work_prefs.accepted_gender:
        wants = work_prefs.accepted_gender
        if wants == AcceptedGender.NO_PREFERENCE:
            score += 40
            reasons.append("مراقب به جنسیت بیمار حساسیتی ندارد")
        elif (wants == AcceptedGender.FEMALE_ONLY and patient.gender == "female") or \
             (wants == AcceptedGender.MALE_ONLY and patient.gender == "male"):
            score += 40
            reasons.append("جنسیت بیمار با ترجیح مراقب هم‌خوانی دارد")
        else:
            reasons.append("جنسیت بیمار با ترجیح مراقب هم‌خوانی ندارد")
    elif not patient.gender:
        reasons.append("جنسیت بیمار ثبت نشده — این معیار محاسبه نشد")

    # Age-range preference (30 points)
    age = _patient_age(patient)
    if age is not None and work_prefs and work_prefs.accepted_age_ranges:
        bracket = _age_bracket(age)
        ranges = work_prefs.accepted_age_ranges
        if "no_preference" in ranges or (bracket and bracket in ranges):
            score += 30
            reasons.append("بازه سنی بیمار با ترجیح مراقب هم‌خوانی دارد")
        else:
            reasons.append("بازه سنی بیمار خارج از ترجیح مراقب است")
    elif age is None:
        reasons.append("تاریخ تولد بیمار ثبت نشده — این معیار محاسبه نشد")

    # Service-area overlap (30 points) — province match is worth
    # something on its own; an exact city match on top is worth more.
    if patient.province_id:
        areas = list(caregiver.service_areas.all())
        province_match = any(a.province_id == patient.province_id for a in areas)
        city_match = patient.city_id and any(a.city_id == patient.city_id for a in areas)
        if city_match:
            score += 30
            reasons.append("منطقه خدماتی مراقب دقیقاً با شهر بیمار مطابقت دارد")
        elif province_match:
            score += 18
            reasons.append("منطقه خدماتی مراقب با استان بیمار مطابقت دارد")
        elif areas:
            reasons.append("منطقه خدماتی ثبت‌شده مراقب با محل بیمار مطابقت ندارد")
        else:
            reasons.append("مراقب هنوز منطقه خدماتی ثبت نکرده است")

    return {"score": score, "reasons": reasons}


def suggest_caregivers_for_patient(patient, limit: int = 10) -> list[dict]:
    """Only ever suggests APPROVED caregivers — an unreviewed profile
    has no business being recommended for a real assignment — and
    excludes anyone already actively assigned to this same patient,
    since suggesting someone who's already assigned isn't useful."""
    from django.db.models import Avg, Count
    from apps.care.models import AssignmentStatus, CaregiverAssignment, CaregiverReview

    already_assigned_ids = set(
        CaregiverAssignment.objects.filter(
            patient=patient, status=AssignmentStatus.ACTIVE,
        ).values_list("caregiver_id", flat=True)
    )

    candidates = CaregiverProfile.objects.filter(
        status=CaregiverStatus.APPROVED,
    ).exclude(id__in=already_assigned_ids).select_related(
        "user", "work_preferences", "compatibility_questionnaire",
    ).prefetch_related("service_areas")

    results = []
    for caregiver in candidates:
        result = score_caregiver_for_patient(caregiver, patient)
        identity = getattr(caregiver.user, "caregiver_identity_profile", None)
        # Shown alongside the fit score, deliberately not folded into
        # it — a caregiver with zero reviews yet shouldn't be
        # penalized by an implicit "no rating = 0" default the way
        # baking this into a single number would require, and a
        # supervisor can weigh "great fit, no track record yet" against
        # "good fit, proven record" themselves rather than trust an
        # opaque combined score to make that judgment call for them.
        review_stats = CaregiverReview.objects.filter(caregiver=caregiver).aggregate(avg=Avg("rating"), count=Count("id"))
        questionnaire = getattr(caregiver, "compatibility_questionnaire", None)
        results.append({
            "caregiver_user_id": caregiver.user_id,
            "caregiver_name": (identity.full_name if identity else None) or caregiver.user.username,
            "caregiver_gender": identity.gender if identity else "",
            "score": result["score"],
            "reasons": result["reasons"],
            "avg_rating": round(review_stats["avg"], 1) if review_stats["avg"] is not None else None,
            "review_count": review_stats["count"],
            "flexibility_score": questionnaire.overall_flexibility_score() if questionnaire else None,
        })

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]
