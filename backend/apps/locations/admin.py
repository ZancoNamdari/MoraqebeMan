from django.contrib import admin

from .models import City, District, Province


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ["name", "ordering_number"]
    search_fields = ["name"]


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ["name", "province"]
    list_filter = ["province"]
    search_fields = ["name"]
    autocomplete_fields = ["province"]


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ["name", "municipality_zone", "city"]
    list_filter = ["city"]
    search_fields = ["name"]
    autocomplete_fields = ["city"]
