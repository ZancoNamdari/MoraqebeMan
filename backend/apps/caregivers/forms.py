from django import forms

from apps.accounts.forms import JSONCheckboxMultipleChoiceField
from apps.caregivers.choices import (
    Ethnicity,
    ChronicDiseaseType,
    MedicationType,
)
from apps.locations.models import Province, City, District
from .models import IdentityProfile, CaregiverServiceArea


class IdentityProfileAdminForm(forms.ModelForm):

    ethnicities = JSONCheckboxMultipleChoiceField(
        choices=Ethnicity.choices,
        label="قومیت / زبان مادری"
    )

    chronic_disease_types = JSONCheckboxMultipleChoiceField(
        choices=ChronicDiseaseType.choices,
        label="انواع بیماری‌های مزمن"
    )

    medication_types = JSONCheckboxMultipleChoiceField(
        choices=MedicationType.choices,
        label="انواع داروها"
    )

    class Meta:
        model = IdentityProfile
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        
        self.fields["province"].queryset = Province.objects.all()

       
        self.fields["city"].queryset = City.objects.all()

        
        self.fields["district"].queryset = District.objects.all()

       
        if self.instance and self.instance.pk:

            if self.instance.province:
                self.fields["city"].queryset = City.objects.filter(
                    province=self.instance.province
                )

            if self.instance.city:
                self.fields["district"].queryset = District.objects.filter(
                    city=self.instance.city
                )

    def save(self, commit=True):
        obj = super().save(commit=False)

        if commit:
            obj.save()
            self.save_m2m()

        return obj

class CaregiverServiceAreaAdminForm(forms.ModelForm):

    class Meta:
        model = CaregiverServiceArea
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        tehran = Province.objects.filter(name="تهران").first()

        if tehran:
            self.fields["province"].queryset = Province.objects.filter(
                id=tehran.id
            )

            self.fields["province"].disabled = True
            self.fields["province"].initial = tehran

            self.fields["city"].queryset = City.objects.filter(
                province=tehran
            )

            self.fields["districts"].queryset = District.objects.filter(
                city__province=tehran
            )

    def save(self, commit=True):
        obj = super().save(commit=False)

        obj.province = Province.objects.get(name="تهران")

        if commit:
            obj.save()
            self.save_m2m()

        return obj