from django.contrib import admin

from .models import (
    CaregiverExperience,
    CaregiverProfile,
    CaregiverReference,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverWorkPreferences,
)

admin.site.register(CaregiverProfile)
admin.site.register(CaregiverWorkPreferences)
admin.site.register(CaregiverServiceArea)
admin.site.register(CaregiverExperience)
admin.site.register(CaregiverSkills)
admin.site.register(CaregiverReference)
