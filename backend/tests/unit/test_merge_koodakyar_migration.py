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


class IdentityEthnicityAndAgeTests(TestCase):
    def _identity(self, n, **kw):
        from apps.caregivers.models import IdentityProfile
        user = get_user_model().objects.create(phone_number=f"0912333000{n}", username=f"e{n}")
        return IdentityProfile.objects.create(user=user, **kw)

    def test_age_is_computed_and_stored_on_save(self):
        import jdatetime
        today = jdatetime.date.today()
        ident = self._identity(1, birth_date=jdatetime.date(today.year - 30, today.month, today.day))
        ident.refresh_from_db()
        self.assertEqual(ident.age, 30)
        ident.birth_date = jdatetime.date(today.year - 31, today.month, today.day)
        ident.save()
        ident.refresh_from_db()
        self.assertEqual(ident.age, 31)

    def test_age_none_without_birth_date(self):
        self.assertIsNone(self._identity(2).age)

    def test_old_turk_values_migrate_to_main_group_plus_subgroup(self):
        m = importlib.import_module("apps.caregivers.migrations.0033_migrate_ethnicity_and_backfill_age")
        ident = self._identity(3, ethnicities=["turk_tabriz", "turk_zanjan", "kurd", "turk_other"])
        m.forwards(django_apps, None)
        ident.refresh_from_db()
        self.assertEqual(ident.ethnicities, ["turk", "kurd"])
        self.assertEqual(ident.ethnicity_details, {"turk": ["tabrizi", "zanjani"]})

    def test_removed_ethnicities_map_to_other(self):
        m = importlib.import_module("apps.caregivers.migrations.0035_remove_ethnicities_tat_assyrian_jewish")
        ident = self._identity(4, ethnicities=["tat", "jewish", "fars", "assyrian"],
                               ethnicity_details={"tat": ["other"], "fars": ["gilaki_neighbor", "tehrani"]})
        m.forwards(django_apps, None)
        ident.refresh_from_db()
        self.assertEqual(ident.ethnicities, ["other", "fars"])
        self.assertEqual(ident.ethnicity_details, {"fars": ["other", "tehrani"]})

    def test_nationality_free_text_maps_to_choice_or_other(self):
        m = importlib.import_module("apps.caregivers.migrations.0037_map_nationality_country")
        a = self._identity(5, nationality_country="افغانستان")
        b = self._identity(6, nationality_country="اهل هند")
        c = self._identity(7, nationality_country="iraq")
        m.forwards(django_apps, None)
        for o in (a, b, c):
            o.refresh_from_db()
        self.assertEqual((a.nationality_country, a.nationality_country_other), ("afghanistan", ""))
        self.assertEqual((b.nationality_country, b.nationality_country_other), ("other", "اهل هند"))
        self.assertEqual((c.nationality_country, c.nationality_country_other), ("iraq", ""))

    def test_serializer_validates_subgroups_and_drops_unselected_main(self):
        from apps.caregivers.serializers import IdentityProfileSerializer
        ok = IdentityProfileSerializer(data={
            "ethnicities": ["turk", "kurd"],
            "ethnicity_details": {"turk": ["tabrizi"], "kurd": ["sanandaji"], "lor": ["lak"]},
        }, partial=True)
        self.assertTrue(ok.is_valid(), ok.errors)
        # «lor» انتخاب نشده بود، پس زیرگروهش نگه داشته نمی‌شود
        self.assertEqual(ok.validated_data["ethnicity_details"], {"turk": ["tabrizi"], "kurd": ["sanandaji"]})
        bad = IdentityProfileSerializer(data={"ethnicities": ["turk"], "ethnicity_details": {"turk": ["nope"]}}, partial=True)
        self.assertFalse(bad.is_valid())
