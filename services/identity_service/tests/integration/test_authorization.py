from tests.base import BaseAPITestCase
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from tests.factories.user_factory import make_user


class ChangeUserRoleTests(BaseAPITestCase):
    def setUp(self):
        self.client = APIClient()
        self.target = make_user(username="target", phone_number="09121000001", role=UserRole.FAMILY)
        self.superuser = make_user(
            username="root", phone_number="09121000002", role=UserRole.SUPERUSER
        )
        self.regular_user = make_user(
            username="regular", phone_number="09121000003", role=UserRole.FAMILY
        )

    def _login_as(self, username):
        response = self.client.post("/api/auth/login/", {
            "username": username, "password": "StrongPass123",
        }, format="json")
        return response.data["tokens"]["access"]

    def test_superuser_can_change_role(self):
        access = self._login_as("root")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch(
            f"/api/auth/users/{self.target.id}/role/", {"role": "caregiver"}, format="json"
        )
        self.assertEqual(response.status_code, 200)

        self.target.refresh_from_db()
        self.assertEqual(self.target.role, "caregiver")

    def test_regular_user_cannot_change_role(self):
        access = self._login_as("regular")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch(
            f"/api/auth/users/{self.target.id}/role/", {"role": "caregiver"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

        self.target.refresh_from_db()
        self.assertEqual(self.target.role, "family")  # unchanged

    def test_change_role_requires_authentication(self):
        response = self.client.patch(
            f"/api/auth/users/{self.target.id}/role/", {"role": "caregiver"}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_role_value_rejected(self):
        access = self._login_as("root")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch(
            f"/api/auth/users/{self.target.id}/role/", {"role": "not_a_real_role"}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_change_role_for_nonexistent_user_returns_400(self):
        access = self._login_as("root")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.patch("/api/auth/users/999999/role/", {"role": "caregiver"}, format="json")
        self.assertEqual(response.status_code, 400)
