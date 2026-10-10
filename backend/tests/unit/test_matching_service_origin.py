from types import SimpleNamespace as NS

from django.test import SimpleTestCase

from apps.care.matching.specialization import origin_match_score
from apps.care.matching.waterfall import _service_type_passes


class ServiceTypeFilterTests(SimpleTestCase):
    def test_legacy_patient_without_service_passes(self):
        ok, _ = _service_type_passes(NS(service_types=["madaryar"]), NS(service_type=""))
        self.assertTrue(ok)

    def test_caregiver_without_declared_services_passes_with_note(self):
        ok, msg = _service_type_passes(NS(service_types=[]), NS(service_type="madaryar"))
        self.assertTrue(ok)
        self.assertIn("ثبت نشده", msg)

    def test_matching_and_mismatching_service(self):
        patient = NS(service_type="madaryar")
        self.assertTrue(_service_type_passes(NS(service_types=["salmandyar", "madaryar"]), patient)[0])
        self.assertFalse(_service_type_passes(NS(service_types=["salmandyar"]), patient)[0])


class OriginScoreTests(SimpleTestCase):
    def test_missing_data_is_none_not_penalty(self):
        self.assertIsNone(origin_match_score(NS(ethnicities=[], ethnicity_details={}), NS(ethnicities=["kurd"], ethnicity_details={})))

    def test_levels(self):
        p = NS(ethnicities=["kurd"], ethnicity_details={"kurd": ["sanandaji"]})
        self.assertEqual(origin_match_score(NS(ethnicities=["kurd"], ethnicity_details={"kurd": ["sanandaji", "ilami"]}), p), 100)
        self.assertEqual(origin_match_score(NS(ethnicities=["kurd"], ethnicity_details={"kurd": ["marivani"]}), p), 70)
        self.assertEqual(origin_match_score(NS(ethnicities=["turk"], ethnicity_details={}), p), 0)
