import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire, CaregiverExperience, CaregiverProfile,
    CaregiverWorkPreferences,
)

migration = importlib.import_module("apps.caregivers.migrations.0030_merge_koodakyar_into_madaryar")


class MergeKoodakyarIntoMadaryarTests(TestCase):
    def _make(self, n, types, subtypes, wp=None, ex=None, q=None):
        user = get_user_model().objects.create(phone_number=f"0912111000{n}", username=f"m{n}")
        profile = CaregiverProfile.objects.create(user=user, service_types=types, service_subtypes=subtypes)
        CaregiverWorkPreferences.objects.create(profile=profile, collaboration_types=[], service_specific_answers=wp or {})
        CaregiverExperience.objects.create(profile=profile, service_specific_answers=ex or {})
        CaregiverCompatibilityQuestionnaire.objects.create(caregiver=profile, service_specific_answers=q or {})
        return profile

    def _run(self):
        migration.forwards(django_apps, None)

    def test_koodakyar_becomes_madaryar_subtypes_and_answers_merge(self):
        p = self._make(
            1, ["koodakyar", "salmandyar"], {"koodakyar": ["general_childcare", "homework_tutor"]},
            wp={"koodakyar": {"max_children_count": "two"}},
            ex={"koodakyar": {"weaning_support_experience": True, "childcare_experience": "1_3"}},
            q={"koodakyar": {"kindness_level": "100"}},
        )
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_types, ["madaryar", "salmandyar"])
        self.assertEqual(p.service_subtypes, {"madaryar": ["child", "homework_helper"]})
        self.assertEqual(p.work_preferences.service_specific_answers, {"madaryar": {"max_children_count": "two"}})
        # key collides with the newborn one in madaryar's form 3 — renamed for the child side
        self.assertEqual(
            p.experience.service_specific_answers,
            {"madaryar": {"childcare_experience": "1_3", "child_weaning_support_experience": True}},
        )
        self.assertEqual(p.compatibility_questionnaire.service_specific_answers, {"madaryar": {"kindness_level": "100"}})

    def test_old_stage_subtypes_become_newborn_plus_stage_preference(self):
        p = self._make(2, ["madaryar"], {"madaryar": ["pregnancy", "labor", "newborn"]}, wp={"madaryar": {"night_shift_ok": True}})
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_subtypes, {"madaryar": ["newborn"]})
        self.assertEqual(
            p.work_preferences.service_specific_answers,
            {"madaryar": {"night_shift_ok": True, "newborn_stage_preferences": ["pregnancy", "labor"]}},
        )

    def test_unrelated_caregiver_untouched(self):
        p = self._make(3, ["salmandyar"], {})
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_types, ["salmandyar"])
        self.assertEqual(p.service_subtypes, {})
