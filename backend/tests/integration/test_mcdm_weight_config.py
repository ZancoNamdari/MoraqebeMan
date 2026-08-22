from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.care.matching.mcdm import AHP_PAIRWISE_MATRIX, AHP_WEIGHTS, get_active_ahp_config
from apps.care.models import MCDMWeightConfig
from tests.factories.user_factory import make_user


EQUAL_MATRIX = [[1] * 6 for _ in range(6)]

INCONSISTENT_MATRIX = [
    [1, 9, 1/9, 9, 1/9, 9],
    [1/9, 1, 9, 1/9, 9, 1/9],
    [9, 1/9, 1, 9, 1/9, 9],
    [1/9, 9, 1/9, 1, 9, 1/9],
    [9, 1/9, 9, 1/9, 1, 9],
    [1/9, 9, 1/9, 9, 1/9, 1],
]


class MCDMWeightConfigModelTests(BaseAPITestCase):
    """MCDMWeightConfig — only one row is ever active at a time."""

    def test_get_active_ahp_config_falls_back_to_default_when_none_exists(self):
        weights, cr, matrix = get_active_ahp_config()
        self.assertEqual(weights, AHP_WEIGHTS)
        self.assertEqual(matrix, AHP_PAIRWISE_MATRIX)

    def test_saving_a_new_active_config_deactivates_the_previous_one(self):
        first = MCDMWeightConfig.objects.create(pairwise_matrix=EQUAL_MATRIX, is_active=True)
        second = MCDMWeightConfig.objects.create(pairwise_matrix=AHP_PAIRWISE_MATRIX, is_active=True)

        first.refresh_from_db()
        self.assertFalse(first.is_active)
        self.assertTrue(second.is_active)

    def test_active_config_is_actually_used(self):
        MCDMWeightConfig.objects.create(pairwise_matrix=EQUAL_MATRIX, is_active=True)
        weights, cr, matrix = get_active_ahp_config()
        for w in weights.values():
            self.assertAlmostEqual(w, 1 / 6, places=3)

    def test_invalid_stored_matrix_falls_back_to_default_rather_than_crashing(self):
        MCDMWeightConfig.objects.create(pairwise_matrix=[[1, 2], [1, 2]], is_active=True)  # wrong shape
        weights, cr, matrix = get_active_ahp_config()
        self.assertEqual(weights, AHP_WEIGHTS)  # fell back safely


class MCDMWeightConfigViewTests(BaseAPITestCase):
    """GET/PUT /api/care/mcdm-weights/"""

    def setUp(self):
        self.supervisor = make_user("sup_weights_view", role=UserRole.SUPERUSER, phone_number="09100006000")
        self.sup_client = APIClient()
        self.sup_client.force_authenticate(self.supervisor)

    def test_get_before_any_config_returns_default(self):
        response = self.sup_client.get("/api/care/mcdm-weights/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_default"])

    def test_put_valid_matrix_activates_it(self):
        response = self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": EQUAL_MATRIX}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(response.data["is_default"])
        for w in response.data["weights"].values():
            self.assertAlmostEqual(w, 1 / 6, places=3)

    def test_get_after_put_returns_the_new_active_config(self):
        self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": EQUAL_MATRIX}, format="json")
        response = self.sup_client.get("/api/care/mcdm-weights/")
        self.assertFalse(response.data["is_default"])

    def test_inconsistent_matrix_is_rejected_not_saved(self):
        response = self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": INCONSISTENT_MATRIX}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(MCDMWeightConfig.objects.count(), 0)  # never saved

    def test_wrong_shape_matrix_is_rejected(self):
        response = self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": [[1, 2], [1, 2]]}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_diagonal_must_be_one(self):
        bad = [row[:] for row in EQUAL_MATRIX]
        bad[0][0] = 5
        response = self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": bad}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_non_supervisor_cannot_view_or_edit(self):
        family_client = APIClient()
        family_client.force_authenticate(make_user("fam_weights_view", role=UserRole.FAMILY, phone_number="09121191000"))
        get_response = family_client.get("/api/care/mcdm-weights/")
        put_response = family_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": EQUAL_MATRIX}, format="json")
        self.assertEqual(get_response.status_code, 403)
        self.assertEqual(put_response.status_code, 403)

    def test_rejected_matrix_does_not_overwrite_a_previously_valid_one(self):
        self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": EQUAL_MATRIX}, format="json")
        self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": INCONSISTENT_MATRIX}, format="json")
        response = self.sup_client.get("/api/care/mcdm-weights/")
        for w in response.data["weights"].values():
            self.assertAlmostEqual(w, 1 / 6, places=3)

    def test_put_writes_audit_entry(self):
        from apps.audit.models import AuditEventType, AuditLog
        self.sup_client.put("/api/care/mcdm-weights/", {"pairwise_matrix": EQUAL_MATRIX}, format="json")
        entry = AuditLog.objects.filter(event_type=AuditEventType.MCDM_WEIGHTS_UPDATED).first()
        self.assertIsNotNone(entry)
