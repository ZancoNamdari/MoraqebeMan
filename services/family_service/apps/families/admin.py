from django.contrib import admin

from .models import FamilyPatientLink, FamilyProfile, PatientCompatibilityQuestionnaire, PatientProfile

admin.site.register(FamilyProfile)
admin.site.register(PatientProfile)
admin.site.register(FamilyPatientLink)
admin.site.register(PatientCompatibilityQuestionnaire)
