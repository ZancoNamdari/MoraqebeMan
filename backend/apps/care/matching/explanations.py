from __future__ import annotations


DIMENSION_LABELS = {
    "cultural_ritual": "عقیدتی و مناسکی",
    "values_professional": (
        "ارزش‌های بنیادین و مرزهای حرفه‌ای"
    ),
    "lifestyle": "سبک زندگی و شرایط محیطی",
    "cultural_flexibility": (
        "متاانعطاف‌پذیری و هوش فرهنگی"
    ),
}


def _score_level(
    score: float | None,
) -> str:

    if score is None:
        return "unavailable"

    if score >= 85:
        return "excellent"

    if score >= 70:
        return "good"

    if score >= 50:
        return "moderate"

    return "weak"


def calculate_confidence(
    candidate: dict,
) -> str:
    """
    Confidence reflects information completeness,
    NOT how good the caregiver is.

    Symmetric by design: objective-fit data alone and trait-match data
    alone count equally toward confidence. An earlier version only
    checked for objective data in isolation, so a caregiver with a
    complete, high-quality trait match (both questionnaires filled in)
    but no recorded gender/age/location preference fell all the way
    through to "low" confidence, even though real, complete matching
    information existed — contradicting this function's own stated
    principle rather than reflecting a deliberate choice about it.
    """

    objective = candidate.get(
        "objective_fit_score"
    )

    trait = candidate.get(
        "trait_match_score"
    )

    review_count = candidate.get(
        "review_count",
        0,
    )

    if (
        objective is not None
        and trait is not None
    ):
        if review_count >= 5:
            return "high"

        return "medium"

    if (
        objective is not None
        or trait is not None
    ):
        return "medium"

    return "low"


def build_match_explanation(
    candidate: dict,
) -> dict:

    strengths = []
    weaknesses = []

    objective_score = candidate.get(
        "objective_fit_score"
    )

    trait_score = candidate.get(
        "trait_match_score"
    )

    mcdm_score = candidate.get(
        "mcdm_score"
    )

    if objective_score is not None:

        if objective_score >= 85:
            strengths.append(
                "تطابق پایه بسیار خوب"
            )

        elif objective_score < 60:
            weaknesses.append(
                "تطابق پایه پایین"
            )

    dimensions = (
        candidate.get(
            "trait_dimension_scores"
        )
        or {}
    )

    for code, score in dimensions.items():

        label = DIMENSION_LABELS.get(
            code,
            code,
        )

        level = _score_level(
            score
        )

        if level == "excellent":

            strengths.append(
                f"{label}: {score} از 100"
            )

        elif level == "weak":

            weaknesses.append(
                f"{label}: {score} از 100"
            )

    cfi = candidate.get(
        "caregiver_cfi"
    )

    if cfi is not None:

        if cfi >= 85:
            strengths.append(
                f"انعطاف فرهنگی مراقب بالا است ({cfi})"
            )

        elif cfi < 50:
            weaknesses.append(
                f"انعطاف فرهنگی مراقب پایین است ({cfi})"
            )

    review_count = candidate.get(
        "review_count",
        0,
    )

    if review_count == 0:

        weaknesses.append(
            "برای این مراقب هنوز سابقه ارزیابی ثبت نشده است"
        )

    elif review_count < 5:

        weaknesses.append(
            "تعداد ارزیابی‌های قبلی محدود است"
        )

    confidence = calculate_confidence(
        candidate
    )

    if mcdm_score is None:

        summary = "اطلاعات کافی برای رتبه‌بندی کامل وجود ندارد"

    elif mcdm_score >= 85:

        summary = "پیشنهاد بسیار قوی"

    elif mcdm_score >= 70:

        summary = "پیشنهاد مناسب"

    elif mcdm_score >= 50:

        summary = "نیازمند بررسی بیشتر"

    else:

        summary = "تناسب پایین"

    return {
        "summary": summary,
        "confidence": confidence,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "mcdm_score": mcdm_score,
        "objective_fit_score": objective_score,
        "trait_match_score": trait_score,
    }