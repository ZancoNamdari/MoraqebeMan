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
CAREGIVER_MAPPINGS = {
    # بخش اول: هم‌راستایی عقیدتی و مناسکی
    "religious_belief_accommodation": {
        "a": {T.RELIGIOUS_FLEXIBILITY: 90}, "b": {T.RELIGIOUS_FLEXIBILITY: 65},
        "c": {T.RELIGIOUS_FLEXIBILITY: 70}, "d": {T.RELIGIOUS_FLEXIBILITY: 25},
    },
    "physical_contact_sensitivity_adaptation": {
        "a": {T.GENDER_SENSITIVITY: 90}, "b": {T.GENDER_SENSITIVITY: 75},
        "c": {T.GENDER_SENSITIVITY: 40}, "d": {T.GENDER_SENSITIVITY: 20},
    },
    "prayer_time_scheduling_flexibility": {
        "a": {T.RITUAL_FLEXIBILITY: 90}, "b": {T.RITUAL_FLEXIBILITY: 65},
        "c": {T.RITUAL_FLEXIBILITY: 30}, "d": {T.RITUAL_FLEXIBILITY: 15},
    },
    # "hidden" flexibility question #1 (per spec: Q4/Q8/Q13 feed the CFI)
    "traditional_belief_acceptance": {
        "a": {T.TRADITIONAL_BELIEF_TOLERANCE: 90}, "b": {T.TRADITIONAL_BELIEF_TOLERANCE: 70},
        "c": {T.TRADITIONAL_BELIEF_TOLERANCE: 35}, "d": {T.TRADITIONAL_BELIEF_TOLERANCE: 15},
    },
    # بخش دوم: هم‌راستایی ارزش‌های بنیادین و مرزهای حرفه‌ای
    # Q5 values are the ONE worked example given in the source spec —
    # used verbatim, "Family Integration" mapped to the closest
    # official trait name, emotional_involvement.
    "family_event_participation": {
        "a": {T.EMOTIONAL_INVOLVEMENT: 100, T.PROFESSIONAL_BOUNDARY: 20},
        "b": {T.EMOTIONAL_INVOLVEMENT: 75, T.PROFESSIONAL_BOUNDARY: 70},
        "c": {T.EMOTIONAL_INVOLVEMENT: 20, T.PROFESSIONAL_BOUNDARY: 100},
        "d": {T.EMOTIONAL_INVOLVEMENT: 50, T.PROFESSIONAL_BOUNDARY: 40},
    },
    "false_accusation_reaction": {
        "a": {T.EMOTIONAL_INVOLVEMENT: 90, T.PROFESSIONAL_BOUNDARY: 30},
        "b": {T.EMOTIONAL_INVOLVEMENT: 60, T.PROFESSIONAL_BOUNDARY: 70},
        "c": {T.EMOTIONAL_INVOLVEMENT: 30, T.PROFESSIONAL_BOUNDARY: 80},
        "d": {T.EMOTIONAL_INVOLVEMENT: 20, T.PROFESSIONAL_BOUNDARY: 40},
    },
    "confidentiality_commitment": {
        "a": {T.PRIVACY_ORIENTATION: 95}, "b": {T.PRIVACY_ORIENTATION: 80},
        "c": {T.PRIVACY_ORIENTATION: 45}, "d": {T.PRIVACY_ORIENTATION: 25},
    },
    # "hidden" flexibility question #2
    "gender_based_task_flexibility": {
        "a": {T.GENDER_ROLE_FLEXIBILITY: 85}, "b": {T.GENDER_ROLE_FLEXIBILITY: 70},
        "c": {T.GENDER_ROLE_FLEXIBILITY: 55}, "d": {T.GENDER_ROLE_FLEXIBILITY: 15},
    },
    # بخش سوم: هم‌راستایی سبک زندگی و محیط کاری
    "home_environment_adaptability": {
        "a": {T.ENVIRONMENT_TOLERANCE: 90}, "b": {T.ENVIRONMENT_TOLERANCE: 70},
        "c": {T.ENVIRONMENT_TOLERANCE: 40}, "d": {T.ENVIRONMENT_TOLERANCE: 15},
    },
    # Documented in docs/MATCHING.md as a genuine source-content
    # inconsistency: option A here reads as rigid ("I keep my
    # schedule, family adapts"), not clearly more flexible than D
    # ("strict unchanged schedule") the way option A is in every other
    # question. Scored to reflect the CONTENT of each option as
    # written, not forced into the A>B>C>D pattern used elsewhere.
    "schedule_flexibility_for_family_events": {
        "a": {T.SCHEDULE_FLEXIBILITY: 35}, "b": {T.SCHEDULE_FLEXIBILITY: 85},
        "c": {T.SCHEDULE_FLEXIBILITY: 75}, "d": {T.SCHEDULE_FLEXIBILITY: 20},
    },
    "traditional_food_treatment_openness": {
        "a": {T.TRADITIONAL_MEDICINE_ORIENTATION: 90}, "b": {T.TRADITIONAL_MEDICINE_ORIENTATION: 70},
        "c": {T.TRADITIONAL_MEDICINE_ORIENTATION: 40}, "d": {T.TRADITIONAL_MEDICINE_ORIENTATION: 15},
    },
    "personal_conversation_patience": {
        "a": {T.EMOTIONAL_INTERACTION_PREFERENCE: 90}, "b": {T.EMOTIONAL_INTERACTION_PREFERENCE: 70},
        "c": {T.EMOTIONAL_INTERACTION_PREFERENCE: 55}, "d": {T.EMOTIONAL_INTERACTION_PREFERENCE: 25},
    },
    # "hidden" flexibility question #3
    "home_organization_adaptability": {
        "a": {T.ORDERLINESS_TOLERANCE: 90}, "b": {T.ORDERLINESS_TOLERANCE: 70},
        "c": {T.ORDERLINESS_TOLERANCE: 40}, "d": {T.ORDERLINESS_TOLERANCE: 15},
    },
    # بخش چهارم: انعطاف‌پذیری فرهنگی و هوش فرهنگی
    "cultural_expression_tolerance": {
        "a": {T.OFFENSIVE_SPEECH_TOLERANCE: 90}, "b": {T.OFFENSIVE_SPEECH_TOLERANCE: 70},
        "c": {T.OFFENSIVE_SPEECH_TOLERANCE: 35}, "d": {T.OFFENSIVE_SPEECH_TOLERANCE: 15},
    },
    # Secondary cultural_tolerance value here specifically because the
    # trait list has 17 named traits across 16 questions — this is the
    # one question given two Dimension-4 traits, since accepting an
    # unfamiliar family custom is both ritual-specific tolerance and a
    # general cultural-tolerance signal at once.
    "unfamiliar_custom_acceptance": {
        "a": {T.RITUAL_TOLERANCE: 90, T.CULTURAL_TOLERANCE: 85},
        "b": {T.RITUAL_TOLERANCE: 80, T.CULTURAL_TOLERANCE: 75},
        "c": {T.RITUAL_TOLERANCE: 55, T.CULTURAL_TOLERANCE: 50},
        "d": {T.RITUAL_TOLERANCE: 20, T.CULTURAL_TOLERANCE: 20},
    },
    "dialect_communication_effort": {
        "a": {T.LANGUAGE_DIALECT_FLEXIBILITY: 90}, "b": {T.LANGUAGE_DIALECT_FLEXIBILITY: 65},
        "c": {T.LANGUAGE_DIALECT_FLEXIBILITY: 55}, "d": {T.LANGUAGE_DIALECT_FLEXIBILITY: 20},
    },
}

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
