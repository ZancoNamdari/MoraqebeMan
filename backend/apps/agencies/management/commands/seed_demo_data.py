import datetime
import random

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User, UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile, AgencySupervisor
from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire,
    CaregiverExperience,
    CaregiverProfile,
    CaregiverSkills,
    CaregiverStatus,
    CaregiverWorkPreferences,
    IdentityProfile,
)
from apps.families.models import FamilyPatientLink, FamilyProfile, LinkStatus, PatientCompatibilityQuestionnaire, PatientProfile, RelationType

DEMO_PASSWORD = "Demo12345"

# Verbatim from tests/integration/test_mcdm.py's own fixtures — real,
# already-verified field names and value shapes, not re-derived here.
FLEXIBLE_CAREGIVER_ANSWERS = {
    "religious_belief_accommodation": "a", "physical_contact_sensitivity_adaptation": "a",
    "prayer_time_scheduling_flexibility": "a", "traditional_belief_acceptance": "a",
    "family_event_participation": "a", "false_accusation_reaction": "a",
    "confidentiality_commitment": "a", "gender_based_task_flexibility": "a",
    "home_environment_adaptability": "a", "schedule_flexibility_for_family_events": "a",
    "traditional_food_treatment_openness": "a", "personal_conversation_patience": "a",
    "home_organization_adaptability": "a",
    "cultural_expression_tolerance": "a", "unfamiliar_custom_acceptance": "a", "dialect_communication_effort": "a",
}
RIGID_CAREGIVER_ANSWERS = {k: "d" for k in FLEXIBLE_CAREGIVER_ANSWERS}


def _mixed_caregiver_answers(seed_index: int) -> dict:
    """A middle-ground answer set, varied per caregiver by index, so
    seeded caregivers aren't just two clusters (all-flexible /
    all-rigid) but a real spread — closer to what matching actually
    has to differentiate between in production."""
    options = ["a", "b", "c", "d"]
    return {
        key: options[(seed_index + i) % 4]
        for i, key in enumerate(FLEXIBLE_CAREGIVER_ANSWERS)
    }


PATIENT_QUESTIONNAIRE_ANSWERS = {
    "religious_beliefs_priority": "somewhat_agree", "new_treatment_openness": "moderate",
    "caregiver_as_family_member": "yes", "respectful_disagreement_acceptance": "mostly_accept",
    "privacy_comfort_with_caregiver": "yes", "noise_smell_sensitivity": "moderate",
    "meal_time_strictness": "moderately_strict", "special_diet_preference": "no",
    "medication_timing_priority": "moderately_strict", "accent_customs_annoyance": "slightly",
    "cultural_respect_expectation": "yes", "willingness_to_express_opinion": "somewhat_willing",
}


class Command(BaseCommand):
    help = (
        "Seeds realistic demo data across the whole platform (agencies, "
        "supervisors, caregivers with full profiles, patients with "
        "families) so the actual end-to-end flow can be walked through "
        "manually in each panel, not just verified by automated tests. "
        "Every seeded account uses the same password so you can log "
        "into any of them while testing: " + DEMO_PASSWORD
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--agencies", type=int, default=2,
            help="Number of demo agencies to create (default: 2)",
        )
        parser.add_argument(
            "--caregivers-per-agency", type=int, default=6,
            help="Approved+pending+blacklisted caregivers per agency (default: 6)",
        )
        parser.add_argument(
            "--patients-per-agency", type=int, default=4,
            help="Patients per agency, split between standalone and with_family modes (default: 4)",
        )

    def handle(self, *args, **options):
        with transaction.atomic():
            summary = self._seed(
                options["agencies"],
                options["caregivers_per_agency"],
                options["patients_per_agency"],
            )
        self._print_summary(summary)

    # -----------------------------------------------------------
    # Seeding
    # -----------------------------------------------------------

    def _seed(self, num_agencies, caregivers_per_agency, patients_per_agency):
        summary = {"agencies": []}
        agency_names = ["آژانس مهرگان", "آژانس نسیم مهربانی", "آژانس سایه سار", "آژانس گلبانگ"]
        caregiver_first_names = ["مریم", "زهرا", "سارا", "فاطمه", "علی", "رضا", "حسین", "امیر", "سمیه", "لیلا"]
        caregiver_last_names = ["احمدی", "رضایی", "کریمی", "محمدی", "حسینی", "قاسمی", "نجفی", "صادقی"]
        patient_names = ["حسن رضوی", "بتول کریمی", "اکبر شریفی", "پروین احمدی", "ابراهیم موسوی", "طاهره نوری"]
        family_first_names = ["امیر", "نازنین", "بهرام", "سپیده"]

        for a_index in range(num_agencies):
            agency_owner = User(
                username=f"demo_agency_owner_{a_index+1}",
                first_name="مدیر", last_name=agency_names[a_index % len(agency_names)],
                phone_number=f"0910000{a_index+1:04d}", role=UserRole.AGENCY,
            )
            agency_owner.set_password(DEMO_PASSWORD)
            agency_owner.save()
            agency = AgencyProfile.objects.create(
                user=agency_owner, company_name=agency_names[a_index % len(agency_names)],
                license_number=f"LIC-{1000+a_index}",
            )

            supervisor_user = User(
                username=f"demo_supervisor_{a_index+1}",
                first_name="سوپروایزر", last_name=agency_names[a_index % len(agency_names)],
                phone_number=f"0910001{a_index+1:04d}", role=UserRole.AGENCY_SUPERVISOR,
            )
            supervisor_user.set_password(DEMO_PASSWORD)
            supervisor_user.save()
            AgencySupervisor.objects.create(user=supervisor_user, agency=agency, created_by=agency_owner)

            agency_summary = {
                "company_name": agency.company_name,
                "access_code": agency.access_code,
                "owner_phone": agency_owner.phone_number,
                "supervisor_phone": supervisor_user.phone_number,
                "caregivers": [],
                "patients": [],
            }

            # ---- Caregivers ----
            for c_index in range(caregivers_per_agency):
                global_index = a_index * caregivers_per_agency + c_index
                first_name = caregiver_first_names[global_index % len(caregiver_first_names)]
                last_name = caregiver_last_names[global_index % len(caregiver_last_names)]
                phone = f"0912{100000 + global_index:07d}"

                caregiver_user = User(
                    username=f"demo_caregiver_{global_index+1}",
                    first_name=first_name, last_name=last_name,
                    phone_number=phone, role=UserRole.CAREGIVER,
                )
                caregiver_user.set_password(DEMO_PASSWORD)
                caregiver_user.save()

                # Most caregivers approved; one per agency pending, one
                # per agency blacklisted — so admin-panel and the
                # blacklist feature have something real to show too.
                if c_index == 0:
                    status = CaregiverStatus.PENDING
                elif c_index == 1:
                    status = CaregiverStatus.SUSPENDED
                else:
                    status = CaregiverStatus.APPROVED

                profile = CaregiverProfile.objects.create(user=caregiver_user, status=status)
                if status == CaregiverStatus.SUSPENDED:
                    profile.blacklist_reason = "داده آزمایشی — نمونه یک مراقب مسدودشده برای تست"
                    profile.save(update_fields=["blacklist_reason"])

                gender = "male" if first_name in ("علی", "رضا", "حسین", "امیر") else "female"
                IdentityProfile.objects.create(user=caregiver_user, gender=gender)

                CaregiverWorkPreferences.objects.create(
                    profile=profile,
                    accepted_gender="no_preference",
                    accepted_age_ranges=["60_70", "70_80", "over_80"],
                    accepted_physical_conditions=["independent", "low_mobility", "limited_mobility_bedridden"],
                    available_shifts=["morning", "afternoon"] if c_index % 2 == 0 else ["24h"],
                )

                # Alternate flexible / rigid / mixed answer sets across
                # caregivers so matching actually differentiates them —
                # the whole point of seeding this instead of leaving
                # everyone identical.
                if global_index % 3 == 0:
                    answers = FLEXIBLE_CAREGIVER_ANSWERS
                elif global_index % 3 == 1:
                    answers = RIGID_CAREGIVER_ANSWERS
                else:
                    answers = _mixed_caregiver_answers(global_index)
                CaregiverCompatibilityQuestionnaire.objects.create(caregiver=profile, **answers)

                CaregiverExperience.objects.create(profile=profile)
                CaregiverSkills.objects.create(profile=profile)

                # Auto-approved link, same as a real supervisor entering
                # this caregiver directly (see apps.caregivers.
                # supervisor_views's CREATE flow).
                AgencyCaregiverLink.objects.create(
                    agency=agency, caregiver=profile,
                    status=AgencyLinkStatus.APPROVED if status != CaregiverStatus.PENDING else AgencyLinkStatus.PENDING,
                    decided_by=agency_owner if status != CaregiverStatus.PENDING else None,
                )

                agency_summary["caregivers"].append({
                    "name": f"{first_name} {last_name}", "phone": phone, "status": status,
                })

            # ---- Patients ----
            for p_index in range(patients_per_agency):
                global_index = a_index * patients_per_agency + p_index
                full_name = patient_names[global_index % len(patient_names)]
                birth_year = 1935 + (global_index % 20)

                patient = PatientProfile.objects.create(
                    full_name=full_name,
                    gender="male" if global_index % 2 == 0 else "female",
                    birth_date=datetime.date(birth_year, random.randint(1, 12), random.randint(1, 28)),
                    physical_condition=["independent", "low_mobility", "alzheimers", "limited_mobility_bedridden"][p_index % 4],
                    needed_shifts=["morning"] if p_index % 2 == 0 else ["24h"],
                )
                PatientCompatibilityQuestionnaire.objects.create(patient=patient, **PATIENT_QUESTIONNAIRE_ANSWERS)
                AgencyPatientLink.objects.create(agency=agency, patient=patient, status=AgencyLinkStatus.APPROVED, decided_by=agency_owner)

                patient_summary = {"name": full_name, "access_code": patient.access_code, "family": None}

                # Half standalone, half with a real family account —
                # both creation modes get exercised.
                if p_index % 2 == 0:
                    family_first = family_first_names[global_index % len(family_first_names)]
                    family_phone = f"0913{200000 + global_index:07d}"
                    family_user = User(
                        username=f"demo_family_{global_index+1}",
                        first_name=family_first, last_name=full_name.split()[-1],
                        phone_number=family_phone, role=UserRole.FAMILY,
                    )
                    family_user.set_password(DEMO_PASSWORD)
                    family_user.save()
                    family = FamilyProfile.objects.create(user=family_user, display_name=f"{family_first} {full_name.split()[-1]}")
                    FamilyPatientLink.objects.create(
                        family=family, patient=patient, relation=RelationType.CHILD,
                        status=LinkStatus.APPROVED, approved_by=agency_owner,
                    )
                    AgencyFamilyLink.objects.create(agency=agency, family=family, status=AgencyLinkStatus.APPROVED, decided_by=agency_owner)
                    patient_summary["family"] = {"phone": family_phone}

                agency_summary["patients"].append(patient_summary)

            summary["agencies"].append(agency_summary)

        return summary

    # -----------------------------------------------------------
    # Output
    # -----------------------------------------------------------

    def _print_summary(self, summary):
        w = self.stdout.write
        w(self.style.SUCCESS(f"\nداده آزمایشی ساخته شد — رمز عبور همه حساب‌ها: {DEMO_PASSWORD}\n"))

        for agency in summary["agencies"]:
            w(self.style.HTTP_INFO(f"\n=== {agency['company_name']} ==="))
            w(f"  کد عضویت آژانس: {agency['access_code']}")
            w(f"  ورود مالک آژانس:      {agency['owner_phone']}")
            w(f"  ورود سوپروایزر:        {agency['supervisor_phone']}")

            w(f"\n  مراقبان ({len(agency['caregivers'])}):")
            for cg in agency["caregivers"]:
                w(f"    {cg['name']:<20} {cg['phone']}   [{cg['status']}]")

            w(f"\n  سالمندها ({len(agency['patients'])}):")
            for p in agency["patients"]:
                line = f"    {p['name']:<20} کد: {p['access_code']}"
                if p["family"]:
                    line += f"   خانواده: {p['family']['phone']}"
                else:
                    line += "   (بدون حساب خانواده — مستقل)"
                w(line)

        w(self.style.SUCCESS(
            "\nپیشنهاد بررسی: با یکی از حساب‌های owner_phone وارد agency-panel شوید، "
            "به /patients بروید، و روی «یافتن مراقب مناسب» یکی از سالمندها بزنید — "
            "باید فهرستی رتبه‌بندی‌شده از مراقبان همین آژانس با نمره و توضیح ببینید.\n"
        ))
