from django.test import SimpleTestCase

from apps.caregivers.serializers import CaregiverCompatibilityQuestionnaireSerializer

BASE = {
    "religiosity_level": "50", "family_compatibility_level": "50",
    "patience_level": "50", "clinical_compatibility_level": "50",
}


class TraitProfilesSerializerTests(SimpleTestCase):
    def _ser(self, tp):
        return CaregiverCompatibilityQuestionnaireSerializer(data={**BASE, "trait_profiles": tp})

    def test_valid_profile_is_kept_and_cleaned(self):
        s = self._ser([{"id": "cooking", "title": "آشپزی", "extra": "x",
                        "traits": [{"key": "taste", "label": "طعم", "percent": 67, "questions": 3, "junk": 1}]}])
        self.assertTrue(s.is_valid(), s.errors)
        self.assertEqual(s.validated_data["trait_profiles"], [
            {"id": "cooking", "title": "آشپزی", "traits": [{"key": "taste", "label": "طعم", "percent": 67, "questions": 3}]}])

    def test_percent_out_of_range_rejected(self):
        s = self._ser([{"id": "a", "title": "t", "traits": [{"key": "k", "label": "l", "percent": 150, "questions": 1}]}])
        self.assertFalse(s.is_valid())

    def test_bad_shape_rejected(self):
        self.assertFalse(self._ser("nope").is_valid())
        self.assertFalse(self._ser([{"id": "a", "title": "t", "traits": "x"}]).is_valid())

    def test_omitted_defaults_ok(self):
        s = CaregiverCompatibilityQuestionnaireSerializer(data=BASE)
        self.assertTrue(s.is_valid(), s.errors)
