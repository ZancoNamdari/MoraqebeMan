import importlib

from django.apps import apps as django_apps
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire, CaregiverExperience, CaregiverProfile,
    CaregiverWorkPreferences,
)
from apps.caregivers.serializers import CaregiverServiceTypesSerializer

migration = importlib.import_module("apps.caregivers.migrations.0041_merge_behyar_into_parastar")


class MergeBehyarIntoParastarTests(TestCase):
    def _make(self, n, types, subtypes, wp=None, ex=None, q=None):
        user = get_user_model().objects.create(phone_number=f"0912444000{n}", username=f"b{n}")
        profile = CaregiverProfile.objects.create(user=user, service_types=types, service_subtypes=subtypes)
        CaregiverWorkPreferences.objects.create(profile=profile, collaboration_types=[], service_specific_answers=wp or {})
        CaregiverExperience.objects.create(profile=profile, service_specific_answers=ex or {})
        CaregiverCompatibilityQuestionnaire.objects.create(caregiver=profile, service_specific_answers=q or {})
        return profile

    def _run(self):
        migration.forwards(django_apps, None)

    def test_behyar_becomes_parastar_branch_with_levels(self):
        p = self._make(
            1, ["behyar", "salmandyar"], {"behyar": ["aide_helper", "behyar"]},
            wp={"behyar": {"physical_tasks_comfort": True, "averse_hospitals_detail": "x"}},
            ex={"behyar": {"aide_training_certificate": True}},
            q={"behyar": {"physical_stamina_level": "100"}},
        )
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_types, ["parastar", "salmandyar"])
        self.assertEqual(p.service_subtypes, {"parastar": ["behyar", "aide_helper", "behyar_level"]})
        self.assertEqual(p.work_preferences.service_specific_answers,
                         {"parastar": {"physical_tasks_comfort": True, "averse_hospitals_detail": "x"}})
        self.assertEqual(p.experience.service_specific_answers, {"parastar": {"aide_training_certificate": True}})
        self.assertEqual(p.compatibility_questionnaire.service_specific_answers,
                         {"parastar": {"physical_stamina_level": "100"}})

    def test_existing_parastar_answers_win_and_subtypes_merge(self):
        p = self._make(
            2, ["parastar", "behyar"], {"parastar": ["specialized_nurse", "icu"], "behyar": ["nurse_helper"]},
            wp={"parastar": {"averse_hospitals_detail": "nurse says"}, "behyar": {"averse_hospitals_detail": "aide says"}},
        )
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_types, ["parastar"])
        self.assertEqual(p.service_subtypes, {"parastar": ["specialized_nurse", "icu", "behyar", "nurse_helper"]})
        self.assertEqual(p.work_preferences.service_specific_answers,
                         {"parastar": {"averse_hospitals_detail": "nurse says"}})

    def test_unrelated_caregiver_untouched(self):
        p = self._make(3, ["salmandyar"], {})
        self._run()
        p.refresh_from_db()
        self.assertEqual(p.service_types, ["salmandyar"])
        self.assertEqual(p.service_subtypes, {})


class ParastarSubtypeSerializerTests(TestCase):
    def test_parastar_accepts_branches_levels_and_specialties(self):
        s = CaregiverServiceTypesSerializer(data={
            "service_types": ["parastar"],
            "service_subtypes": {"parastar": ["specialized_nurse", "nursing_specialist", "icu", "behyar", "aide_helper", "behyar_level"]},
        })
        self.assertTrue(s.is_valid(), s.errors)

    def test_behyar_is_no_longer_a_service_type(self):
        s = CaregiverServiceTypesSerializer(data={"service_types": ["behyar"]})
        self.assertFalse(s.is_valid())
