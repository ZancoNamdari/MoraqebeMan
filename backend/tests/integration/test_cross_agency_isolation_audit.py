from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class CrossAgencyIsolationAuditTests(BaseAPITestCase):
    """
    Dedicated isolation audit, deliberately separate from
    test_agency_supervisor_caregiver_scoping.py — that file tests each
    endpoint's own behavior in depth; this one exists purely to
    systematically confirm NO scoped endpoint leaks another agency's
    data, closing a real gap in the original coverage: only 5 of the
    12 wizard sub-views (detail, identity, full-profile, progress,
    delete) were explicitly isolation-tested when Part 2 was built.
    The other 7 (work-preferences, questionnaire, service-areas x2,
    experience, skills, references) relied on the shared helper
    functions being correct "by construction" — true in principle,
    but exactly the kind of assumption an isolation audit exists to
    verify empirically instead of trusting structurally.
    """

    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("audit_agency_owner", role=UserRole.AGENCY, phone_number="09100012001"),
            company_name="آژانس ممیزی",
        )
        self.supervisor_user = make_user("audit_agency_super", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100012002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)
        self.supervisor_client = APIClient()
        self.supervisor_client.force_authenticate(self.supervisor_user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("audit_agency_owner2", role=UserRole.AGENCY, phone_number="09100012003"),
            company_name="آژانس ممیزی دو",
        )
        self.other_supervisor_user = make_user("audit_agency_super2", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100012004")
        AgencySupervisor.objects.create(user=self.other_supervisor_user, agency=self.other_agency, created_by=self.other_agency.user)
        self.other_client = APIClient()
        self.other_client.force_authenticate(self.other_supervisor_user)

        # One real caregiver, created and owned by self.agency only.
        create_response = self.supervisor_client.post(
            "/api/supervisor/caregivers/",
            {"first_name": "سمیه", "last_name": "قاسمی", "phone_number": "09121600001"},
            format="json",
        )
        self.user_id = create_response.data["user_id"]

        # A real service area, so the DELETE isolation check has a
        # real target instead of a 404-for-unrelated-reasons id.
        area_response = self.supervisor_client.post(
            f"/api/supervisor/caregivers/{self.user_id}/service-areas/",
            {},
            format="json",
        )
        self.area_id = area_response.data.get("id") if area_response.status_code == 201 else None

    # -----------------------------------------------------------
    # Reads — all 7 previously-untested sub-views
    # -----------------------------------------------------------

    def test_work_preferences_get_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/work-preferences/")
        self.assertEqual(response.status_code, 404)

    def test_compatibility_questionnaire_get_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/compatibility-questionnaire/")
        self.assertEqual(response.status_code, 404)

    def test_service_areas_list_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/service-areas/")
        self.assertEqual(response.status_code, 404)

    def test_experience_get_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/experience/")
        self.assertEqual(response.status_code, 404)

    def test_skills_get_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/skills/")
        self.assertEqual(response.status_code, 404)

    def test_references_get_isolated(self):
        response = self.other_client.get(f"/api/supervisor/caregivers/{self.user_id}/references/")
        self.assertEqual(response.status_code, 404)

    # -----------------------------------------------------------
    # Writes — confirm mutation is blocked too, not just reads
    # -----------------------------------------------------------

    def test_work_preferences_put_isolated(self):
        response = self.other_client.put(f"/api/supervisor/caregivers/{self.user_id}/work-preferences/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_compatibility_questionnaire_put_isolated(self):
        response = self.other_client.put(f"/api/supervisor/caregivers/{self.user_id}/compatibility-questionnaire/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_service_areas_post_isolated(self):
        response = self.other_client.post(
            f"/api/supervisor/caregivers/{self.user_id}/service-areas/", {}, format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_service_area_delete_isolated(self):
        if self.area_id is None:
            self.skipTest("service-area creation fixture failed — see setUp")
        response = self.other_client.delete(f"/api/supervisor/caregivers/{self.user_id}/service-areas/{self.area_id}/")
        self.assertEqual(response.status_code, 404)

    def test_experience_put_isolated(self):
        response = self.other_client.put(f"/api/supervisor/caregivers/{self.user_id}/experience/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_skills_put_isolated(self):
        response = self.other_client.put(f"/api/supervisor/caregivers/{self.user_id}/skills/", {}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_references_put_isolated(self):
        response = self.other_client.put(f"/api/supervisor/caregivers/{self.user_id}/references/", {"references": []}, format="json")
        self.assertEqual(response.status_code, 404)

    # -----------------------------------------------------------
    # Sanity control — proves legitimate same-agency access still
    # works on every one of these. An isolation audit that only shows
    # things are BLOCKED could pass by accident (e.g. a bug that
    # 404s literally everyone, isolated or not).
    # -----------------------------------------------------------

    def test_same_agency_supervisor_is_not_accidentally_blocked(self):
        # NOTE on why this uses PUT, not a bare GET: GET on an
        # unfilled form (work-preferences, questionnaire, experience,
        # skills, references) legitimately 404s for "no data yet" —
        # a completely different reason than a tenant-scoping block,
        # but producing the identical status code. An earlier version
        # of this test used GET and failed here, not because of a
        # scoping bug, but because this caregiver (freshly created in
        # setUp, no forms filled in) genuinely has no work-preferences
        # row yet.
        #
        # The assertion is deliberately just "not 403/404", not a
        # specific success code — the tenant-visibility check runs
        # BEFORE request-body validation (it has to, to know whether
        # to even look up the target), so a 404 from THAT check would
        # never reach deeper validation logic to begin with. What
        # this test can actually be certain of is: once the tenant
        # check passes, whatever happens next (success, or a genuine
        # 400 validation complaint about the payload) is real business
        # logic, not a scoping block — which is the only thing this
        # sanity check exists to prove.
        for url, payload in [
            (f"/api/supervisor/caregivers/{self.user_id}/work-preferences/", {}),
            (f"/api/supervisor/caregivers/{self.user_id}/compatibility-questionnaire/", {}),
            (f"/api/supervisor/caregivers/{self.user_id}/experience/", {}),
            (f"/api/supervisor/caregivers/{self.user_id}/skills/", {}),
            (f"/api/supervisor/caregivers/{self.user_id}/references/", {"references": []}),
        ]:
            response = self.supervisor_client.put(url, payload, format="json")
            self.assertNotIn(
                response.status_code, (403, 404),
                f"PUT {url} was wrongly blocked for the OWNING agency (got {response.status_code})",
            )

        # service-areas is the one exception where a bare GET is safe
        # to use directly — it's a LIST endpoint, so it returns 200
        # with an array (empty or not) rather than 404 for "nothing
        # here yet". setUp already created one, so this also confirms
        # it's actually visible, not just that the list call succeeds.
        list_response = self.supervisor_client.get(f"/api/supervisor/caregivers/{self.user_id}/service-areas/")
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(len(list_response.data), 1)

    # -----------------------------------------------------------
    # Patient-side isolation, re-verified here for one single place
    # that documents the full isolation surface end to end.
    # -----------------------------------------------------------

    def test_other_agency_sees_zero_patients_of_its_own(self):
        self.supervisor_client.post(
            f"/api/agencies/{self.agency.id}/patients/",
            {"mode": "standalone", "patient": {"full_name": "بیمار آژانس اول"}},
            format="json",
        )
        response = self.other_client.get(f"/api/agencies/{self.other_agency.id}/patients/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_agency_roster_never_shows_another_agencys_approved_caregiver(self):
        # Both caregivers get an APPROVED AgencyCaregiverLink on
        # creation (Part 2's auto-link) — confirm the roster listing
        # itself still can't cross the boundary even though both
        # links are APPROVED, just for different agencies.
        other_create_response = self.other_client.post(
            "/api/supervisor/caregivers/",
            {"first_name": "رها", "last_name": "کاظمی", "phone_number": "09121600099"},
            format="json",
        )
        other_agency_client = APIClient()
        other_agency_client.force_authenticate(self.other_agency.user)
        roster_response = other_agency_client.get("/api/agencies/me/caregivers/")

        self.assertEqual(roster_response.status_code, 200)
        phone_numbers = [row["caregiver_phone_number"] for row in roster_response.data]
        # The important assertion: self.agency's caregiver (created in
        # setUp, phone 09121600001) must never appear in
        # other_agency's own roster view.
        self.assertNotIn("09121600001", phone_numbers)
