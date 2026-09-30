"""
Caregiver matching engine.

Public API:

    from apps.care.matching import suggest_caregivers_for_patient
    from apps.care.matching import suggest_caregivers_for_agency_patient
"""

from .agency_scoped import suggest_caregivers_for_agency_patient, suggest_patients_for_agency_caregiver
from .engine import suggest_caregivers_for_patient

__all__ = [
    "suggest_caregivers_for_patient",
    "suggest_caregivers_for_agency_patient",
    "suggest_patients_for_agency_caregiver",
]