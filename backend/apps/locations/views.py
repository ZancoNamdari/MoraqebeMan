"""
Read-only reference data for the cascading province -> city -> district
selects (the supervisor wizard, and eventually the real caregiver/
patient onboarding forms too — this data isn't specific to caregivers).
Any authenticated user can read it; there's nothing sensitive here and
gating it further would just be friction.
"""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import City, District, Province
from .serializers import CitySerializer, DistrictSerializer, ProvinceSerializer


class ProvinceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        provinces = Province.objects.all()
        return Response(ProvinceSerializer(provinces, many=True).data)


class CityListView(APIView):
    """GET /api/locations/cities/?province_id=<id>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        province_id = request.query_params.get("province_id")
        cities = City.objects.all()
        if province_id:
            cities = cities.filter(province_id=province_id)
        return Response(CitySerializer(cities, many=True).data)


class DistrictListView(APIView):
    """GET /api/locations/districts/?city_id=<id>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        city_id = request.query_params.get("city_id")
        districts = District.objects.all()
        if city_id:
            districts = districts.filter(city_id=city_id)
        return Response(DistrictSerializer(districts, many=True).data)
