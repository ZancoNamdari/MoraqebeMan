from rest_framework.test import APIRequestFactory

from apps.accounts.models import UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyProfile, AgencySupervisor
from apps.agencies.tenancy import (
    agency_caregiver_profile_ids,
    agency_caregiver_user_ids,
    caregiver_visible_to_tenant,
    resolve_own_agency_for_supervisor,
    resolve_tenant_context,
)
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user


class ResolveTenantContextTests(BaseAPITestCase):
    """
    Direct tests of the module that replaced two previously-separate
    implementations of "is this user allowed to act for this agency"
    — the single place this now needs to be correct, instead of two.
    """

    def setUp(self):
        self.factory = APIRequestFactory()
        self.agency = AgencyProfile.objects.create(
            user=make_user("tenancy_agency_owner", role=UserRole.AGENCY, phone_number="09100013001"),
            company_name="آژانس تست",
        )
        self.supervisor_user = make_user("tenancy_supervisor", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100013002")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)

        self.other_agency = AgencyProfile.objects.create(
            user=make_user("tenancy_other_owner", role=UserRole.AGENCY, phone_number="09100013003"),
            company_name="آژانس تست دو",
        )
        self.superuser = make_user("tenancy_superuser", role=UserRole.SUPERUSER, phone_number="09100013004")
        self.unrelated_caregiver = make_user("tenancy_unrelated", role=UserRole.CAREGIVER, phone_number="09100013005")

    def _request_as(self, user):
        request = self.factory.get("/")
        request.user = user
        return request

    def test_agency_owner_resolves_own_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.agency.user), self.agency.id)
        self.assertIsNotNone(ctx)
        self.assertEqual(ctx.agency.id, self.agency.id)
        self.assertEqual(ctx.actor_role, "owner")

    def test_agency_owner_cannot_resolve_a_different_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.agency.user), self.other_agency.id)
        self.assertIsNone(ctx)

    def test_supervisor_resolves_own_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.supervisor_user), self.agency.id)
        self.assertIsNotNone(ctx)
        self.assertEqual(ctx.actor_role, "supervisor")

    def test_supervisor_cannot_resolve_a_different_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.supervisor_user), self.other_agency.id)
        self.assertIsNone(ctx)

    def test_allow_supervisor_false_blocks_supervisor_even_for_own_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.supervisor_user), self.agency.id, allow_supervisor=False)
        self.assertIsNone(ctx)

    def test_superuser_resolves_any_agency(self):
        ctx = resolve_tenant_context(self._request_as(self.superuser), self.agency.id)
        self.assertEqual(ctx.actor_role, "superuser")
        ctx2 = resolve_tenant_context(self._request_as(self.superuser), self.other_agency.id)
        self.assertEqual(ctx2.actor_role, "superuser")

    def test_unrelated_role_resolves_nothing(self):
        ctx = resolve_tenant_context(self._request_as(self.unrelated_caregiver), self.agency.id)
        self.assertIsNone(ctx)

    def test_nonexistent_agency_id_resolves_nothing_even_for_superuser(self):
        ctx = resolve_tenant_context(self._request_as(self.superuser), 999999)
        self.assertIsNone(ctx)


class ResolveOwnAgencyForSupervisorTests(BaseAPITestCase):
    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("tenancy_own_agency_owner", role=UserRole.AGENCY, phone_number="09100013010"),
            company_name="آژانس تست سه",
        )
        self.supervisor_user = make_user("tenancy_own_supervisor", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100013011")
        AgencySupervisor.objects.create(user=self.supervisor_user, agency=self.agency, created_by=self.agency.user)

    def test_returns_the_supervisors_own_agency(self):
        agency = resolve_own_agency_for_supervisor(self.supervisor_user)
        self.assertEqual(agency.id, self.agency.id)

    def test_non_supervisor_role_returns_none(self):
        agency_owner = self.agency.user
        self.assertIsNone(resolve_own_agency_for_supervisor(agency_owner))

    def test_supervisor_role_with_no_actual_profile_returns_none(self):
        orphaned = make_user("tenancy_orphan_supervisor", role=UserRole.AGENCY_SUPERVISOR, phone_number="09100013012")
        self.assertIsNone(resolve_own_agency_for_supervisor(orphaned))


class AgencyCaregiverIdHelperTests(BaseAPITestCase):
    def setUp(self):
        self.agency = AgencyProfile.objects.create(
            user=make_user("tenancy_ids_owner", role=UserRole.AGENCY, phone_number="09100013020"),
            company_name="آژانس تست چهار",
        )
        approved_user = make_user("tenancy_ids_approved", role=UserRole.CAREGIVER, phone_number="09100013021")
        self.approved_profile = CaregiverProfile.objects.create(user=approved_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.approved_profile, status=AgencyLinkStatus.APPROVED)

        pending_user = make_user("tenancy_ids_pending", role=UserRole.CAREGIVER, phone_number="09100013022")
        self.pending_profile = CaregiverProfile.objects.create(user=pending_user, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=self.agency, caregiver=self.pending_profile, status=AgencyLinkStatus.PENDING)

    def test_profile_ids_include_only_approved(self):
        ids = list(agency_caregiver_profile_ids(self.agency))
        self.assertIn(self.approved_profile.id, ids)
        self.assertNotIn(self.pending_profile.id, ids)

    def test_user_ids_include_only_approved(self):
        ids = list(agency_caregiver_user_ids(self.agency))
        self.assertIn(self.approved_profile.user_id, ids)
        self.assertNotIn(self.pending_profile.user_id, ids)

    def test_caregiver_visible_to_tenant_true_for_approved(self):
        self.assertTrue(caregiver_visible_to_tenant(self.agency, self.approved_profile.user_id))

    def test_caregiver_visible_to_tenant_false_for_pending(self):
        self.assertFalse(caregiver_visible_to_tenant(self.agency, self.pending_profile.user_id))

    def test_caregiver_visible_to_tenant_false_for_unrelated_caregiver(self):
        unrelated_user = make_user("tenancy_ids_unrelated", role=UserRole.CAREGIVER, phone_number="09100013023")
        CaregiverProfile.objects.create(user=unrelated_user, status=CaregiverStatus.APPROVED)
        self.assertFalse(caregiver_visible_to_tenant(self.agency, unrelated_user.id))
