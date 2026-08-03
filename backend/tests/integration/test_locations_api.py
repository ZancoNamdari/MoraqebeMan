from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.authentication.services import SimpleJWTTokenIssuer


class LocationsApiTests(TestCase):
    def setUp(self):
        user = User.objects.create(username="u1", phone_number="09120000000", email="u@a.com", role=UserRole.FAMILY)
        user.set_password("x")
        user.save()
        token = SimpleJWTTokenIssuer().issue(user)["access"]
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_provinces_list(self):
        response = self.client.get("/api/locations/provinces/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 31)
        self.assertTrue(any(p["name"] == "تهران" for p in response.data))

    def test_cities_filtered_by_province(self):
        tehran = next(p for p in self.client.get("/api/locations/provinces/").data if p["name"] == "تهران")
        response = self.client.get(f"/api/locations/cities/?province_id={tehran['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) > 0)
        self.assertTrue(all(c["province"] == tehran["id"] for c in response.data))

    def test_districts_filtered_by_city(self):
        tehran = next(p for p in self.client.get("/api/locations/provinces/").data if p["name"] == "تهران")
        cities = self.client.get(f"/api/locations/cities/?province_id={tehran['id']}").data
        tehran_city = next(c for c in cities if c["name"] == "تهران")
        response = self.client.get(f"/api/locations/districts/?city_id={tehran_city['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data) > 0)

    def test_non_tehran_city_has_no_districts(self):
        isfahan = next(p for p in self.client.get("/api/locations/provinces/").data if p["name"] == "اصفهان")
        cities = self.client.get(f"/api/locations/cities/?province_id={isfahan['id']}").data
        response = self.client.get(f"/api/locations/districts/?city_id={cities[0]['id']}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_requires_authentication(self):
        client = APIClient()
        response = client.get("/api/locations/provinces/")
        self.assertEqual(response.status_code, 401)
