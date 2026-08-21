from __future__ import annotations

import datetime

from apps.caregivers.choices import AcceptedGender
from apps.caregivers.models import CaregiverProfile


OBJECTIVE_CRITERIA = (
    "gender",
    "age",
    "location",
)

OBJECTIVE_WEIGHTS = {
    "gender": 0.40,
    "age": 0.30,
    "location": 0.30,
}


def patient_age(patient) -> int | None:

    birth_date = getattr(
        patient,
        "birth_date",
        None,
    )

    if birth_date is None:
        return None

    born = birth_date

    if hasattr(
        born,
        "togregorian",
    ):
        born = born.togregorian()

    today = datetime.date.today()

    return (
        today.year
        - born.year
        - (
            (today.month, today.day)
            < (born.month, born.day)
        )
    )


def age_bracket(
    age: int,
) -> str | None:

    if age < 60:
        return None

    if age <= 70:
        return "60_70"

    if age <= 80:
        return "70_80"

    return "over_80"


def gender_score(
    caregiver: CaregiverProfile,
    patient,
) -> int | None:

    patient_gender = getattr(
        patient,
        "gender",
        None,
    )

    work_preferences = getattr(
        caregiver,
        "work_preferences",
        None,
    )

    if (
        not patient_gender
        or not work_preferences
    ):
        return None

    preference = getattr(
        work_preferences,
        "accepted_gender",
        None,
    )

    if not preference:
        return None

    if preference == AcceptedGender.NO_PREFERENCE:
        return 100

    if (
        preference == AcceptedGender.FEMALE_ONLY
        and patient_gender == "female"
    ):
        return 100

    if (
        preference == AcceptedGender.MALE_ONLY
        and patient_gender == "male"
    ):
        return 100

    return 0


def age_score(
    caregiver: CaregiverProfile,
    patient,
) -> int | None:

    age = patient_age(patient)

    work_preferences = getattr(
        caregiver,
        "work_preferences",
        None,
    )

    if (
        age is None
        or not work_preferences
    ):
        return None

    accepted_ranges = getattr(
        work_preferences,
        "accepted_age_ranges",
        None,
    )

    if not accepted_ranges:
        return None

    bracket = age_bracket(age)

    if (
        "no_preference" in accepted_ranges
        or (
            bracket
            and bracket in accepted_ranges
        )
    ):
        return 100

    return 0


def location_score(
    caregiver: CaregiverProfile,
    patient,
) -> int | None:

    patient_province_id = getattr(
        patient,
        "province_id",
        None,
    )

    if not patient_province_id:
        return None

    areas = list(
        caregiver.service_areas.all()
    )

    if not areas:
        return 0

    province_match = any(
        area.province_id
        == patient_province_id
        for area in areas
    )

    if not province_match:
        return 0

    patient_city_id = getattr(
        patient,
        "city_id",
        None,
    )

    if patient_city_id:

        city_match = any(
            area.city_id
            == patient_city_id
            for area in areas
        )

        if city_match:
            return 100

    return 60


def calculate_objective_score(
    caregiver: CaregiverProfile,
    patient,
) -> dict:

    values = {
        "gender": gender_score(
            caregiver,
            patient,
        ),
        "age": age_score(
            caregiver,
            patient,
        ),
        "location": location_score(
            caregiver,
            patient,
        ),
    }

    available = {
        criterion: value
        for criterion, value in values.items()
        if value is not None
    }

    if not available:
        return {
            "score": None,
            "criterion_scores": {},
            "reasons": [
                "اطلاعات کافی برای محاسبه تطابق پایه وجود ندارد"
            ],
        }

    total_weight = sum(
        OBJECTIVE_WEIGHTS[key]
        for key in available
    )

    score = (
        sum(
            available[key]
            * OBJECTIVE_WEIGHTS[key]
            for key in available
        )
        / total_weight
    )

    reasons = []

    if values["gender"] is None:
        reasons.append(
            "جنسیت بیمار یا ترجیح جنسیتی مراقب ثبت نشده — این معیار محاسبه نشد"
        )
    elif values["gender"] == 100:
        reasons.append(
            "ترجیح جنسیتی مراقب با بیمار سازگار است"
        )
    else:
        reasons.append(
            "جنسیت بیمار با ترجیح مراقب سازگار نیست"
        )

    if values["age"] is None:
        reasons.append(
            "تاریخ تولد بیمار ثبت نشده — این معیار محاسبه نشد"
        )
    elif values["age"] == 100:
        reasons.append(
            "بازه سنی بیمار با ترجیح مراقب سازگار است"
        )
    else:
        reasons.append(
            "بازه سنی بیمار خارج از ترجیح مراقب است"
        )

    if values["location"] is None:
        reasons.append(
            "استان بیمار ثبت نشده — معیار منطقه‌ای محاسبه نشد"
        )
    elif values["location"] == 100:
        reasons.append(
            "شهر بیمار با منطقه خدماتی مراقب منطبق است"
        )
    elif values["location"] == 60:
        reasons.append(
            "استان بیمار با منطقه خدماتی مراقب منطبق است"
        )
    else:
        reasons.append(
            "منطقه خدماتی مراقب با محل بیمار مطابقت ندارد"
        )

    return {
        "score": round(score, 2),
        "criterion_scores": values,
        "reasons": reasons,
    }