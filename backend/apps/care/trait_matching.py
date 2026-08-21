"""
The trait-based matching engine — the actual "so what" that
QuestionTraitMapping (apps/care/models.py) and seed_trait_mappings
(the seeded configuration table) exist to support. This module turns
two filled-in questionnaires into a real, spec-compliant compatibility
score: never comparing raw A/B/C/D answers directly, always going
through each answer's trait values first.

Kept deliberately separate from matching.py, which still holds the
original v1 objective fit score (gender/age/location) — that score is
unaffected by any of this and continues to work exactly as before.
This module's output is ADDED alongside it in suggest_caregivers_for_
patient(), not a replacement.
"""
from apps.care.models import MatchingProfileSide, QuestionTraitMapping, TraitDimension, TraitName

# Per the spec: some traits should be SIMILAR between patient and
# caregiver to be a good match (a caregiver whose own professional-
# boundary preference matches the patient's is a better fit either
# direction — very boundaried or very close, as long as they agree).
# Others should be judged by the CAREGIVER's flexibility against the
# PATIENT's sensitivity — a caregiver's own value on that trait barely
# matters, what matters is how well they can ADAPT to whatever the
# patient needs. Classification follows the spec's own worked
# examples for each category directly.
SIMILARITY_TRAITS = frozenset({
    TraitName.PROFESSIONAL_BOUNDARY,
    TraitName.ORDERLINESS_TOLERANCE,
    TraitName.SCHEDULE_FLEXIBILITY,
    TraitName.EMOTIONAL_INVOLVEMENT,
    TraitName.EMOTIONAL_INTERACTION_PREFERENCE,
    TraitName.ENVIRONMENT_TOLERANCE,
    TraitName.PRIVACY_ORIENTATION,
})

ADAPTABILITY_TRAITS = frozenset({
    TraitName.RELIGIOUS_FLEXIBILITY,
    TraitName.RITUAL_FLEXIBILITY,
    TraitName.TRADITIONAL_BELIEF_TOLERANCE,
    TraitName.GENDER_SENSITIVITY,
    TraitName.GENDER_ROLE_FLEXIBILITY,
    TraitName.TRADITIONAL_MEDICINE_ORIENTATION,
    TraitName.CULTURAL_TOLERANCE,
    TraitName.OFFENSIVE_SPEECH_TOLERANCE,
    TraitName.RITUAL_TOLERANCE,
    TraitName.LANGUAGE_DIALECT_FLEXIBILITY,
})

assert SIMILARITY_TRAITS | ADAPTABILITY_TRAITS == set(TraitName.values), \
    "every trait must be classified as similarity or adaptability, exactly once"
assert not (SIMILARITY_TRAITS & ADAPTABILITY_TRAITS)

DIMENSION_TRAITS = {
    TraitDimension.CULTURAL_RITUAL: [
        TraitName.RELIGIOUS_FLEXIBILITY, TraitName.GENDER_SENSITIVITY,
        TraitName.RITUAL_FLEXIBILITY, TraitName.TRADITIONAL_BELIEF_TOLERANCE,
    ],
    TraitDimension.VALUES_PROFESSIONAL: [
        TraitName.PROFESSIONAL_BOUNDARY, TraitName.PRIVACY_ORIENTATION,
        TraitName.GENDER_ROLE_FLEXIBILITY, TraitName.EMOTIONAL_INVOLVEMENT,
    ],
    TraitDimension.LIFESTYLE: [
        TraitName.ENVIRONMENT_TOLERANCE, TraitName.SCHEDULE_FLEXIBILITY,
        TraitName.TRADITIONAL_MEDICINE_ORIENTATION, TraitName.EMOTIONAL_INTERACTION_PREFERENCE,
        TraitName.ORDERLINESS_TOLERANCE,
    ],
    TraitDimension.CULTURAL_FLEXIBILITY: [
        TraitName.CULTURAL_TOLERANCE, TraitName.OFFENSIVE_SPEECH_TOLERANCE,
        TraitName.RITUAL_TOLERANCE, TraitName.LANGUAGE_DIALECT_FLEXIBILITY,
    ],
}
assert sum(len(v) for v in DIMENSION_TRAITS.values()) == len(TraitName.values), \
    "every trait must belong to exactly one dimension"

# The spec's own stated dimension weights (not the initial 25%-each
# placeholder mentioned earlier in the same document — this is the
# figure given twice more, once directly in the Overall Score formula
# and once again in the explicit "وزن‌دهی" section, both matching each
# other exactly). Still Product Configuration, not a validated
# scientific result — the spec is explicit about this itself, framing
# it as a starting point for later AHP-based refinement.
DEFAULT_DIMENSION_WEIGHTS = {
    TraitDimension.CULTURAL_RITUAL: 0.30,
    TraitDimension.VALUES_PROFESSIONAL: 0.20,
    TraitDimension.LIFESTYLE: 0.25,
    TraitDimension.CULTURAL_FLEXIBILITY: 0.25,
}

# The spec explicitly calls out Q4/Q8/Q13/Q14/Q15/Q16 as questions
# "specifically designed to measure flexibility" and asks for them to
# ALSO be pooled into one cross-cutting index, separate from their own
# dimension's score. Q15 (unfamiliar_custom_acceptance) maps to two
# traits at once (see seed_trait_mappings.py) — both are averaged in
# for that question's contribution to CFI.
CFI_QUESTION_TRAITS = {
    "traditional_belief_acceptance": [TraitName.TRADITIONAL_BELIEF_TOLERANCE],       # Q4
    "gender_based_task_flexibility": [TraitName.GENDER_ROLE_FLEXIBILITY],            # Q8
    "home_organization_adaptability": [TraitName.ORDERLINESS_TOLERANCE],             # Q13
    "cultural_expression_tolerance": [TraitName.OFFENSIVE_SPEECH_TOLERANCE],         # Q14
    "unfamiliar_custom_acceptance": [TraitName.RITUAL_TOLERANCE, TraitName.CULTURAL_TOLERANCE],  # Q15
    "dialect_communication_effort": [TraitName.LANGUAGE_DIALECT_FLEXIBILITY],        # Q16
}


def compute_trait_profile(
    profile_type: str,
    questionnaire,
) -> dict:
    """
    Convert questionnaire answers into trait values.

    Raw answer options are never treated as scores.
    They are converted through QuestionTraitMapping.
    """

    if questionnaire is None:
        return {}

    mappings = QuestionTraitMapping.objects.filter(
        profile_type=profile_type,
    )

    by_field: dict[str, list] = {}

    for mapping in mappings:
        by_field.setdefault(
            mapping.question_field,
            [],
        ).append(mapping)

    trait_values: dict[str, list[int]] = {}

    for question_field, field_mappings in by_field.items():

        actual_answer = getattr(
            questionnaire,
            question_field,
            None,
        )

        if actual_answer is None:
            continue

        for mapping in field_mappings:

            if mapping.answer_option == actual_answer:

                trait_values.setdefault(
                    mapping.trait,
                    [],
                ).append(
                    mapping.value
                )

    return {
        trait: round(
            sum(values) / len(values)
        )
        for trait, values in trait_values.items()
        if values
    }


def similarity_score(
    patient_value: int,
    caregiver_value: int,
) -> int:
    """
    Similarity model.

    Higher similarity = better compatibility.
    """

    return max(
        0,
        100 - abs(
            patient_value
            - caregiver_value
        ),
    )


def adaptability_score(
    patient_sensitivity: int,
    caregiver_flexibility: int,
) -> int:
    """
    Adaptability model — a caregiver's flexibility only needs to meet
    or exceed what the patient's sensitivity actually requires.

    Deliberately NOT the simpler patient_sensitivity *
    caregiver_flexibility / 100 formula (which this file reverted to
    at one point before being corrected back): that formula scores a
    caregiver whose flexibility EXCEEDS what a moderately-sensitive
    patient needs as worse than one who exactly meets it — e.g.
    sensitivity=50, flexibility=100 scores only 50, treating "more
    accommodating than necessary" as if it were a shortfall. This
    gap-based version scores that case as 100 (no unmet need at all),
    and lands closer to this project's own spec document's worked
    example (sensitivity=95, flexibility=90 -> ~90 stated in the spec;
    this formula gives 95, the multiplicative one gives 86).
    """

    gap = max(
        0,
        patient_sensitivity - caregiver_flexibility,
    )

    return max(
        0,
        100 - gap,
    )


def compute_dimension_scores(
    patient_traits: dict,
    caregiver_traits: dict,
) -> dict:
    """
    Calculate the four dimension scores.

    Missing traits are ignored rather than treated as zero.
    """

    scores = {}

    for dimension, traits in DIMENSION_TRAITS.items():

        trait_scores = []

        for trait in traits:

            if (
                trait not in patient_traits
                or trait not in caregiver_traits
            ):
                continue

            patient_value = patient_traits[trait]
            caregiver_value = caregiver_traits[trait]

            if trait in SIMILARITY_TRAITS:

                score = similarity_score(
                    patient_value,
                    caregiver_value,
                )

            else:

                score = adaptability_score(
                    patient_value,
                    caregiver_value,
                )

            trait_scores.append(score)

        if trait_scores:

            scores[dimension] = round(
                sum(trait_scores)
                / len(trait_scores)
            )

    return scores


def compute_overall_score(
    dimension_scores: dict,
    weights: dict | None = None,
) -> int | None:

    weights = (
        weights
        or DEFAULT_DIMENSION_WEIGHTS
    )

    available = {
        dimension: weight
        for dimension, weight in weights.items()
        if dimension in dimension_scores
    }

    if not available:
        return None

    total_weight = sum(
        available.values()
    )

    return round(
        sum(
            dimension_scores[dimension]
            * weight
            for dimension, weight
            in available.items()
        )
        / total_weight
    )


def compute_cfi(
    caregiver_traits: dict,
) -> int | None:

    values = []

    for traits in CFI_QUESTION_TRAITS.values():

        relevant = [
            caregiver_traits[trait]
            for trait in traits
            if trait in caregiver_traits
        ]

        if relevant:

            values.append(
                sum(relevant)
                / len(relevant)
            )

    if not values:
        return None

    return round(
        sum(values)
        / len(values)
    )


def compute_full_match(
    patient_questionnaire,
    caregiver_questionnaire,
    weights: dict | None = None,
    patient_traits: dict | None = None,
) -> dict:
    """
    Full trait-based match.

    IMPORTANT:
    The trait match is available only when BOTH questionnaires
    exist.

    This prevents a missing questionnaire from silently becoming
    a partial or assumed compatibility score.
    """

    if (
        patient_questionnaire is None
        or caregiver_questionnaire is None
    ):
        return {
            "overall_score": None,
            "dimension_scores": {},
            "dimension_labels": {},
            "caregiver_cfi": None,
            "patient_traits": {},
            "caregiver_traits": {},
            "available": False,
        }

    if patient_traits is None:

        patient_traits = compute_trait_profile(
            MatchingProfileSide.PATIENT,
            patient_questionnaire,
        )

    caregiver_traits = compute_trait_profile(
        MatchingProfileSide.CAREGIVER,
        caregiver_questionnaire,
    )

    if not patient_traits or not caregiver_traits:

        return {
            "overall_score": None,
            "dimension_scores": {},
            "dimension_labels": {},
            "caregiver_cfi": (
                compute_cfi(caregiver_traits)
                if caregiver_traits
                else None
            ),
            "patient_traits": patient_traits,
            "caregiver_traits": caregiver_traits,
            "available": False,
        }

    dimension_scores = (
        compute_dimension_scores(
            patient_traits,
            caregiver_traits,
        )
    )

    return {
        "overall_score": compute_overall_score(
            dimension_scores,
            weights,
        ),

        # IMPORTANT:
        # Internal API uses enum VALUE, not Persian label.
        "dimension_scores": {
            dimension.value: score
            for dimension, score
            in dimension_scores.items()
        },

        "dimension_labels": {
            dimension.value: dimension.label
            for dimension in dimension_scores
        },

        "caregiver_cfi": compute_cfi(
            caregiver_traits
        ),

        "patient_traits": patient_traits,
        "caregiver_traits": caregiver_traits,

        "available": True,
    }