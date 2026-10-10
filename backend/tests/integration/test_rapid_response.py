"""برچسب «فورس‌ماژور»: فقط آژانس/ادمین می‌زند؛ مراحل شرایط همکاری/سوابق/مهارت را حذف می‌کند."""
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.caregivers.models import CaregiverProfile, CaregiverServiceArea, CaregiverWorkPreferences
from apps.caregivers.rapid import RAPID_RESPONSE_TAG
from apps.caregivers.views import _missing_forms
from tests.factories.user_factory import make_user


class RapidResponseTests(TestCase):
    def setUp(self):
        self.cg_user = make_user("cg_rapid", role=UserRole.CAREGIVER, phone_number="09125559001")
        self.profile = CaregiverProfile.objects.create(user=self.cg_user)
        self.admin = APIClient(); self.admin.force_authenticate(make_user("adm_rapid", role=UserRole.ADMIN, phone_number="09125559002"))

    def _missing(self):
        self.profile.refresh_from_db()
        with patch("apps.caregivers.views._get_identity_dict", return_value={"father_name": "x"}):
            return _missing_forms(self.profile, self.cg_user.id)

    def test_admin_or_agency_toggles_tag_via_service_types(self):
        url = f"/api/supervisor/caregivers/{self.cg_user.id}/service-types/"
        r = self.admin.put(url, {"service_types": ["nezafatchi"], "rapid_response": True}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.json()["rapid_response"])
        self.profile.refresh_from_db()
        self.assertIn(RAPID_RESPONSE_TAG, self.profile.tags)
        self.assertTrue(self.admin.get(url).json()["rapid_response"])
        # ارسال مجدد بدون rapid_response برچسب را دست‌نخورده می‌گذارد؛ false برش می‌دارد
        self.admin.put(url, {"service_types": ["nezafatchi"]}, format="json")
        self.profile.refresh_from_db(); self.assertIn(RAPID_RESPONSE_TAG, self.profile.tags)
        self.admin.put(url, {"service_types": ["nezafatchi"], "rapid_response": False}, format="json")
        self.profile.refresh_from_db(); self.assertNotIn(RAPID_RESPONSE_TAG, self.profile.tags)

    def test_caregiver_cannot_set_the_tag_for_themselves(self):
        c = APIClient(); c.force_authenticate(self.cg_user)
        r = c.put("/api/caregivers/me/service-types/", {"service_types": ["nezafatchi"], "rapid_response": True}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.profile.refresh_from_db()
        self.assertNotIn(RAPID_RESPONSE_TAG, self.profile.tags)
        self.assertEqual(c.put(f"/api/supervisor/caregivers/{self.cg_user.id}/service-types/", {"rapid_response": True}, format="json").status_code, 403)

    def test_regular_caregiver_still_needs_all_forms(self):
        m = self._missing()
        self.assertIn("شرایط همکاری (فرم ۲)", m)
        self.assertIn("سوابق کاری (فرم ۳)", m)
        self.assertIn("مهارت‌ها (فرم ۳)", m)

    def test_rapid_caregiver_needs_only_terms_and_service_area(self):
        self.profile.tags = [RAPID_RESPONSE_TAG]; self.profile.save(update_fields=["tags"])
        m = self._missing()
        self.assertFalse(any("فرم ۲" in x or "فرم ۳" in x for x in m), m)
        self.assertTrue(any("پذیرش" in x for x in m))
        self.assertTrue(any("محل خدمت" in x for x in m))
        CaregiverWorkPreferences.objects.create(profile=self.profile, terms_accepted=True)
        self.assertEqual(self._missing(), ["محل خدمت (حداقل یک منطقه خدماتی)"])
        self.profile.serves_all_areas = True; self.profile.save(update_fields=["serves_all_areas"])
        self.assertEqual(self._missing(), [])
