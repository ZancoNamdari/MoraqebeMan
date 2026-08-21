from __future__ import annotations

from dataclasses import dataclass, field

from apps.care.models import (
    AssignmentStatus,
)
from apps.caregivers.choices import AcceptedGender
from apps.caregivers.models import (
    CaregiverProfile,
    CaregiverStatus,
)


@dataclass
class WaterfallResult:
    eligible: bool
    reasons: list[str] = field(
        default_factory=list
    )
    failed_rules: list[str] = field(
        default_factory=list
    )


def _gender_hard_constraint_passes(
    caregiver: CaregiverProfile,
    patient,
) -> tuple[bool, str | None]:

    work_preferences = getattr(
        caregiver,
        "work_preferences",
        None,
    )

    if not work_preferences:
        return True, None

    preference = getattr(
        work_preferences,
        "accepted_gender",
        None,
    )

    if not preference:
        return True, None

    patient_gender = getattr(
        patient,
        "gender",
        None,
    )

    if not patient_gender:
        return True, None

    if preference == AcceptedGender.NO_PREFERENCE:
        return True, None

    if (
        preference == AcceptedGender.FEMALE_ONLY
        and patient_gender != "female"
    ):
        return (
            False,
            "جنسیت بیمار با محدودیت جنسیتی مراقب سازگار نیست",
        )

    if (
        preference == AcceptedGender.MALE_ONLY
        and patient_gender != "male"
    ):
        return (
            False,
            "جنسیت بیمار با محدودیت جنسیتی مراقب سازگار نیست",
        )

    return True, None


def _service_area_passes(
    caregiver: CaregiverProfile,
    patient,
) -> tuple[bool, str | None]:

    patient_province_id = getattr(
        patient,
        "province_id",
        None,
    )

    patient_city_id = getattr(
        patient,
        "city_id",
        None,
    )

    if not patient_province_id:
        return (
            True,
            "محل بیمار کامل ثبت نشده؛ معیار منطقه‌ای قابل بررسی کامل نیست",
        )

    areas = list(
        caregiver.service_areas.all()
    )

    if not areas:
        return (
            False,
            "مراقب هیچ منطقه خدماتی ثبت نکرده است",
        )

    province_match = any(
        area.province_id == patient_province_id
        for area in areas
    )

    if not province_match:
        return (
            False,
            "استان محل بیمار خارج از مناطق خدماتی مراقب است",
        )

    if patient_city_id:

        city_match = any(
            area.city_id == patient_city_id
            for area in areas
        )

        if city_match:
            return (
                True,
                "شهر محل بیمار با منطقه خدماتی مراقب منطبق است",
            )

    return (
        True,
        "استان محل بیمار با منطقه خدماتی مراقب منطبق است",
    )


def evaluate_waterfall(
    caregiver: CaregiverProfile,
    patient,
    already_assigned_ids: set,
) -> WaterfallResult:
    """
    Hard eligibility filter.

    TOPSIS must never be allowed to compensate for a failed
    hard requirement.
    """

    reasons = []
    failures = []

    # ---------------------------------------------------------
    # 1. Approval
    # ---------------------------------------------------------

    if caregiver.status != CaregiverStatus.APPROVED:

        failures.append(
            "مراقب تأیید نهایی نشده است"
        )

    else:

        reasons.append(
            "وضعیت مراقب تأیید شده است"
        )

    # ---------------------------------------------------------
    # 2. Existing active assignment
    # ---------------------------------------------------------

    if caregiver.id in already_assigned_ids:

        failures.append(
            "مراقب در حال حاضر به همین بیمار تخصیص داده شده است"
        )

    # ---------------------------------------------------------
    # 3. Hard gender constraint
    # ---------------------------------------------------------

    gender_ok, gender_message = (
        _gender_hard_constraint_passes(
            caregiver,
            patient,
        )
    )

    if not gender_ok and gender_message:
        failures.append(
            gender_message
        )
    elif gender_message:
        reasons.append(
            gender_message
        )

    # ---------------------------------------------------------
    # 4. Service area
    # ---------------------------------------------------------

    area_ok, area_message = (
        _service_area_passes(
            caregiver,
            patient,
        )
    )

    if not area_ok and area_message:
        failures.append(
            area_message
        )
    elif area_message:
        reasons.append(
            area_message
        )

    return WaterfallResult(
        eligible=not failures,
        reasons=reasons,
        failed_rules=failures,
    )