from django.urls import path

from .views import CityListView, DistrictListView, ProvinceListView

urlpatterns = [
    path("locations/provinces/", ProvinceListView.as_view(), name="location-provinces"),
    path("locations/cities/", CityListView.as_view(), name="location-cities"),
    path("locations/districts/", DistrictListView.as_view(), name="location-districts"),
]
