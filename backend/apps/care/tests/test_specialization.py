from django.test import SimpleTestCase

from apps.care.matching.specialization import (
    physical_condition_score,
    shift_availability_score,
)


class _FakeWorkPreferences:
    def __init__(self, accepted_physical_conditions=None, available_shifts=None):
        self.accepted_physical_conditions = accepted_physical_conditions
        self.available_shifts = available_shifts


class _FakeCaregiver:
    def __init__(self, work_preferences=None):
        self.work_preferences = work_preferences


class _FakePatient:
    def __init__(self, physical_condition=None, needed_shifts=None):
        self.physical_condition = physical_condition
        self.needed_shifts = needed_shifts


class PhysicalConditionScoreTests(SimpleTestCase):

    def test_matching_condition_scores_100(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(accepted_physical_conditions=["alzheimers", "low_mobility"]))
        patient = _FakePatient(physical_condition="alzheimers")
        self.assertEqual(physical_condition_score(caregiver, patient), 100)

    def test_non_matching_condition_scores_zero(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(accepted_physical_conditions=["low_mobility"]))
        patient = _FakePatient(physical_condition="alzheimers")
        self.assertEqual(physical_condition_score(caregiver, patient), 0)

    def test_caregiver_no_preference_always_matches(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(accepted_physical_conditions=["no_preference"]))
        patient = _FakePatient(physical_condition="bedridden_diaper")
        self.assertEqual(physical_condition_score(caregiver, patient), 100)

    def test_patient_condition_not_set_returns_none(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(accepted_physical_conditions=["alzheimers"]))
        patient = _FakePatient(physical_condition="")
        self.assertIsNone(physical_condition_score(caregiver, patient))

    def test_caregiver_has_no_work_preferences_returns_none(self):
        caregiver = _FakeCaregiver(work_preferences=None)
        patient = _FakePatient(physical_condition="alzheimers")
        self.assertIsNone(physical_condition_score(caregiver, patient))

    def test_caregiver_accepted_conditions_empty_returns_none(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(accepted_physical_conditions=[]))
        patient = _FakePatient(physical_condition="alzheimers")
        self.assertIsNone(physical_condition_score(caregiver, patient))


class ShiftAvailabilityScoreTests(SimpleTestCase):

    def test_overlapping_shift_scores_100(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(available_shifts=["morning", "night"]))
        patient = _FakePatient(needed_shifts=["night"])
        self.assertEqual(shift_availability_score(caregiver, patient), 100)

    def test_no_overlap_scores_zero(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(available_shifts=["morning"]))
        patient = _FakePatient(needed_shifts=["night"])
        self.assertEqual(shift_availability_score(caregiver, patient), 0)

    def test_24h_caregiver_always_matches(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(available_shifts=["24h"]))
        patient = _FakePatient(needed_shifts=["night", "afternoon"])
        self.assertEqual(shift_availability_score(caregiver, patient), 100)

    def test_patient_needed_shifts_empty_returns_none(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(available_shifts=["morning"]))
        patient = _FakePatient(needed_shifts=[])
        self.assertIsNone(shift_availability_score(caregiver, patient))

    def test_caregiver_available_shifts_empty_returns_none(self):
        caregiver = _FakeCaregiver(_FakeWorkPreferences(available_shifts=[]))
        patient = _FakePatient(needed_shifts=["morning"])
        self.assertIsNone(shift_availability_score(caregiver, patient))

    def test_caregiver_has_no_work_preferences_returns_none(self):
        caregiver = _FakeCaregiver(work_preferences=None)
        patient = _FakePatient(needed_shifts=["morning"])
        self.assertIsNone(shift_availability_score(caregiver, patient))
