"""
Seeds QuestionTraitMapping — the configurable Mapping Table the spec
requires. Only one worked example was given in the source spec (the
caregiver's Q5: family_event_participation). Every other mapping below
is my own careful, documented design work, calibrated against that one
given example's point spread (100/75/20/50-style ranges, not simple
25-point steps) rather than reverting to a flat A=100/B=75/C=50/D=25
scale the spec explicitly warns against.

These are Product Configuration, not a validated scientific result —
exactly as the source spec itself frames its own initial weights
("این وزن‌ها Product Configuration هستند... بعداً با AHP... اعتبارسنجی
می‌شوند"). Re-running this command is safe and idempotent
(update_or_create per row) specifically so these values can be revised
without a migration once real usage data exists.

Run: python manage.py seed_trait_mappings
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.care.models import MatchingProfileSide, QuestionTraitMapping, TraitName

T = TraitName

# profile_type -> question_field -> answer_option -> {trait: value}
# پرسشنامه‌ی مراقب فقط ۴ سؤال ۰/۵۰/۱۰۰ دارد (religiosity_level, family_compatibility_level,
# patience_level, clinical_compatibility_level)؛ هر پاسخ روی چند ویژگی نگاشت می‌شود تا هر ۱۷ ویژگی
# سیگنال بگیرد. مقدار = ۰→۱۵، ۵۰→۵۵، ۱۰۰→۹۰ (یکنوا: پاسخِ بالاتر = انعطاف/تطبیق بیشتر).
# این‌ها Product Configuration‌اند و بدون migration با اجرای مجدد این دستور قابل تغییرند.
_LEVEL_VALUE = {"0": 15, "50": 55, "100": 90}
_CAREGIVER_FIELD_TRAITS = {
    "religiosity_level": [
        T.RELIGIOUS_FLEXIBILITY, T.RITUAL_FLEXIBILITY, T.TRADITIONAL_BELIEF_TOLERANCE, T.RITUAL_TOLERANCE,
    ],
    "family_compatibility_level": [
        T.EMOTIONAL_INVOLVEMENT, T.EMOTIONAL_INTERACTION_PREFERENCE, T.CULTURAL_TOLERANCE,
        T.LANGUAGE_DIALECT_FLEXIBILITY, T.GENDER_ROLE_FLEXIBILITY,
    ],
    "patience_level": [
        T.OFFENSIVE_SPEECH_TOLERANCE, T.ORDERLINESS_TOLERANCE, T.SCHEDULE_FLEXIBILITY, T.ENVIRONMENT_TOLERANCE,
    ],
    "clinical_compatibility_level": [
        T.TRADITIONAL_MEDICINE_ORIENTATION, T.GENDER_SENSITIVITY, T.PROFESSIONAL_BOUNDARY, T.PRIVACY_ORIENTATION,
    ],
}
CAREGIVER_MAPPINGS = {
    field: {opt: {trait: val for trait in traits} for opt, val in _LEVEL_VALUE.items()}
    for field, traits in _CAREGIVER_FIELD_TRAITS.items()
}
assert {t for ts in _CAREGIVER_FIELD_TRAITS.values() for t in ts} == set(TraitName.values)


# Patient traits represent SENSITIVITY/IMPORTANCE on the same named
# axis, not flexibility — a HIGH value means the patient needs a
# caregiver who scores HIGH on the caregiver-side trait of the same
# name, consumed by the Adaptability Matching formula
# (Client Sensitivity x Caregiver Flexibility / 100).
PATIENT_MAPPINGS = {
    "religious_beliefs_priority": {
        "strongly_agree": {T.RELIGIOUS_FLEXIBILITY: 90}, "somewhat_agree": {T.RELIGIOUS_FLEXIBILITY: 65},
        "somewhat_disagree": {T.RELIGIOUS_FLEXIBILITY: 35}, "strongly_disagree": {T.RELIGIOUS_FLEXIBILITY: 15},
    },
    # Judgment call, documented in docs/MATCHING.md: interpreted as
    # "openness to modern/new approaches" being roughly INVERSE to
    # needing traditional-belief accommodation — high openness to new
    # treatment suggests lower attachment to traditional ways, not
    # higher. Flagged as uncertain rather than presented as settled.
    "new_treatment_openness": {
        "very_high": {T.TRADITIONAL_BELIEF_TOLERANCE: 20}, "moderate": {T.TRADITIONAL_BELIEF_TOLERANCE: 50},
        "low": {T.TRADITIONAL_BELIEF_TOLERANCE: 75}, "none": {T.TRADITIONAL_BELIEF_TOLERANCE: 90},
    },
    "caregiver_as_family_member": {
        "yes": {T.EMOTIONAL_INVOLVEMENT: 90}, "partially": {T.EMOTIONAL_INVOLVEMENT: 55}, "no": {T.EMOTIONAL_INVOLVEMENT: 20},
    },
    "respectful_disagreement_acceptance": {
        "reject": {T.PROFESSIONAL_BOUNDARY: 85}, "reluctantly_accept": {T.PROFESSIONAL_BOUNDARY: 65},
        "mostly_accept": {T.PROFESSIONAL_BOUNDARY: 40}, "fully_accept": {T.PROFESSIONAL_BOUNDARY: 20},
    },
    "privacy_comfort_with_caregiver": {
        "no": {T.PRIVACY_ORIENTATION: 90}, "partially": {T.PRIVACY_ORIENTATION: 55}, "yes": {T.PRIVACY_ORIENTATION: 20},
    },
    "noise_smell_sensitivity": {
        "very_high": {T.ENVIRONMENT_TOLERANCE: 90}, "moderate": {T.ENVIRONMENT_TOLERANCE: 55},
        "low": {T.ENVIRONMENT_TOLERANCE: 30}, "none": {T.ENVIRONMENT_TOLERANCE: 10},
    },
    # TimingStrictnessScale — resolved option set (see
    # docs/MATCHING.md), same point spread the earlier generic
    # very_high..none placeholder used, just carried over onto the
    # real confirmed option keys.
    "meal_time_strictness": {
        "very_strict": {T.SCHEDULE_FLEXIBILITY: 85}, "moderately_strict": {T.SCHEDULE_FLEXIBILITY: 55},
        "flexible": {T.SCHEDULE_FLEXIBILITY: 30}, "not_important": {T.SCHEDULE_FLEXIBILITY: 10},
    },
    "special_diet_preference": {
        "yes": {T.TRADITIONAL_MEDICINE_ORIENTATION: 75}, "partially": {T.TRADITIONAL_MEDICINE_ORIENTATION: 45}, "no": {T.TRADITIONAL_MEDICINE_ORIENTATION: 15},
    },
    "medication_timing_priority": {
        "very_strict": {T.SCHEDULE_FLEXIBILITY: 85}, "moderately_strict": {T.SCHEDULE_FLEXIBILITY: 55},
        "flexible": {T.SCHEDULE_FLEXIBILITY: 30}, "not_important": {T.SCHEDULE_FLEXIBILITY: 10},
    },
    "accent_customs_annoyance": {
        "very_much": {T.LANGUAGE_DIALECT_FLEXIBILITY: 90}, "a_lot": {T.LANGUAGE_DIALECT_FLEXIBILITY: 70},
        "slightly": {T.LANGUAGE_DIALECT_FLEXIBILITY: 40}, "not_at_all": {T.LANGUAGE_DIALECT_FLEXIBILITY: 15},
    },
    "cultural_respect_expectation": {
        "yes": {T.CULTURAL_TOLERANCE: 80}, "partially": {T.CULTURAL_TOLERANCE: 50}, "no": {T.CULTURAL_TOLERANCE: 20},
    },
    # ExpressionWillingnessScale — resolved option set (see
    # docs/MATCHING.md), same point spread the earlier generic
    # very_high..none placeholder used, carried over onto the real
    # confirmed option keys.
    "willingness_to_express_opinion": {
        "very_willing": {T.OFFENSIVE_SPEECH_TOLERANCE: 70}, "somewhat_willing": {T.OFFENSIVE_SPEECH_TOLERANCE: 50},
        "rarely_willing": {T.OFFENSIVE_SPEECH_TOLERANCE: 35}, "not_willing": {T.OFFENSIVE_SPEECH_TOLERANCE: 20},
    },
}


class Command(BaseCommand):
    help = "Seeds QuestionTraitMapping for both questionnaires (idempotent)."

    def handle(self, *args, **options):
        with transaction.atomic():
            created, updated = 0, 0
            # ردیف‌های قدیمیِ ۱۶ سؤالیِ مراقب دیگر فیلدی ندارند؛ پاک می‌شوند.
            QuestionTraitMapping.objects.filter(profile_type=MatchingProfileSide.CAREGIVER).exclude(
                question_field__in=list(CAREGIVER_MAPPINGS)
            ).delete()
            for profile_type, mapping in [
                (MatchingProfileSide.CAREGIVER, CAREGIVER_MAPPINGS),
                (MatchingProfileSide.PATIENT, PATIENT_MAPPINGS),
            ]:
                for question_field, options_dict in mapping.items():
                    for answer_option, traits in options_dict.items():
                        for trait, value in traits.items():
                            _, was_created = QuestionTraitMapping.objects.update_or_create(
                                profile_type=profile_type, question_field=question_field,
                                answer_option=answer_option, trait=trait,
                                defaults={"value": value},
                            )
                            created += was_created
                            updated += not was_created
        self.stdout.write(self.style.SUCCESS(f"seeded trait mappings: {created} created, {updated} updated"))
