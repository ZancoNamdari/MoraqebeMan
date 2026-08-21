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


def compute_trait_profile(profile_type: str, questionnaire) -> dict:
    """Converts a filled-in questionnaire instance into trait values —
    the actual mechanism the spec requires: never read an answer's
    letter/value as a score directly, always look it up in the
    configured mapping table for what trait(s) it represents. Returns
    {} for an unanswered questionnaire (caller decides what that means
    — usually "this signal wasn't available", not zero)."""
    if questionnaire is None:
        return {}

    mappings = QuestionTraitMapping.objects.filter(profile_type=profile_type)
    by_field: dict[str, list] = {}
    for m in mappings:
        by_field.setdefault(m.question_field, []).append(m)

    trait_values: dict[str, list[int]] = {}
    for question_field, field_mappings in by_field.items():
        actual_answer = getattr(questionnaire, question_field, None)
        if actual_answer is None:
            continue
        for m in field_mappings:
            if m.answer_option == actual_answer:
                trait_values.setdefault(m.trait, []).append(m.value)

    return {trait: round(sum(vals) / len(vals)) for trait, vals in trait_values.items()}


def similarity_score(patient_value: int, caregiver_value: int) -> int:
    """Similarity = 100 - |patient - caregiver|, per the spec exactly —
    for traits where being alike (in either direction) is the good
    outcome, not one specific value being universally better."""
    return max(0, 100 - abs(patient_value - caregiver_value))


def adaptability_score(
    patient_sensitivity: int,
    caregiver_flexibility: int,
) -> int:

    required_flexibility = patient_sensitivity

    gap = max(
        0,
        required_flexibility
        - caregiver_flexibility,
    )

    return max(
        0,
        100 - gap,
    )


def compute_dimension_scores(patient_traits: dict, caregiver_traits: dict) -> dict:
    """Per-dimension match score (0-100) — similarity formula for
    similarity-type traits, adaptability formula for adaptability-type
    traits, averaged per dimension. A dimension is only included if at
    least one of its traits could actually be computed on both sides —
    an unanswered dimension is missing, not silently scored as 0."""
    scores = {}
    for dimension, traits in DIMENSION_TRAITS.items():
        trait_scores = []
        for trait in traits:
            if trait not in patient_traits or trait not in caregiver_traits:
                continue
            p_val, c_val = patient_traits[trait], caregiver_traits[trait]
            if trait in SIMILARITY_TRAITS:
                trait_scores.append(similarity_score(p_val, c_val))
            else:
                trait_scores.append(adaptability_score(p_val, c_val))
        if trait_scores:
            scores[dimension] = round(sum(trait_scores) / len(trait_scores))
    return scores


def compute_overall_score(dimension_scores: dict, weights: dict | None = None) -> int | None:
    """Weighted sum per the spec's Overall Score formula. Missing
    dimensions are excluded and the remaining weights renormalized,
    rather than treating a missing dimension as a zero — an
    incomplete questionnaire should produce a partial-but-honest
    score, not a punished one."""
    weights = weights or DEFAULT_DIMENSION_WEIGHTS
    available = {d: w for d, w in weights.items() if d in dimension_scores}
    if not available:
        return None
    total_weight = sum(available.values())
    return round(sum(dimension_scores[d] * w for d, w in available.items()) / total_weight)


def compute_cfi(caregiver_traits: dict) -> int | None:
    """Cultural Flexibility Index — the spec's separate cross-cutting
    index pooling the 6 questions specifically designed to measure
    flexibility, independent of which dimension each one otherwise
    belongs to. CFI = average of those 6 questions' trait value(s)."""
    values = []
    for traits in CFI_QUESTION_TRAITS.values():
        relevant = [caregiver_traits[t] for t in traits if t in caregiver_traits]
        if relevant:
            values.append(sum(relevant) / len(relevant))
    if not values:
        return None
    return round(sum(values) / len(values))


def compute_full_match(patient_questionnaire, caregiver_questionnaire, weights: dict | None = None, patient_traits: dict | None = None) -> dict:
    """The complete trait-based comparison between one patient and one
    caregiver — dimension scores, overall weighted score, and the
    caregiver's CFI, all together.

    patient_traits can be precomputed and passed in when scoring the
    same patient against many caregivers in a loop (the normal case,
    in suggest_caregivers_for_patient) — the patient's own trait
    profile doesn't change per-candidate, so recomputing it identically
    on every iteration would be pure waste. Left optional so this
    function stays simple to call standalone (as in tests) without
    the caller having to compute anything up front."""
    if patient_traits is None:
        patient_traits = compute_trait_profile(MatchingProfileSide.PATIENT, patient_questionnaire)
    caregiver_traits = compute_trait_profile(MatchingProfileSide.CAREGIVER, caregiver_questionnaire)
    dimension_scores = compute_dimension_scores(patient_traits, caregiver_traits)
    return {
        "overall_score": compute_overall_score(dimension_scores, weights),
        "dimension_scores": {dim.label: score for dim, score in dimension_scores.items()},
        "caregiver_cfi": compute_cfi(caregiver_traits) if caregiver_traits else None,
    }
