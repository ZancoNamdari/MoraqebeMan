"""Test helpers for the 4-question caregiver compatibility questionnaire.

The production QuestionTraitMapping seed still references the old 16 caregiver
fields, so caregivers give the trait engine no signal. Tests that exercise the
engine therefore call `seed_caregiver_test_mappings()` to map the 4 current
fields onto every trait (monotonic: a higher answer = a more flexible trait)."""
from apps.care.models import MatchingProfileSide, QuestionTraitMapping, TraitName

FIELDS = ("religiosity_level", "family_compatibility_level", "patience_level", "clinical_compatibility_level")
FLEX_ANSWERS = {f: "100" for f in FIELDS}
RIGID_ANSWERS = {f: "0" for f in FIELDS}
_VALUE = {"0": 15, "50": 55, "100": 90}


def seed_caregiver_test_mappings():
    traits = list(TraitName.values)
    for i, trait in enumerate(traits):
        field = FIELDS[i % len(FIELDS)]
        for option, value in _VALUE.items():
            QuestionTraitMapping.objects.update_or_create(
                profile_type=MatchingProfileSide.CAREGIVER, question_field=field,
                answer_option=option, trait=trait, defaults={"value": value},
            )
