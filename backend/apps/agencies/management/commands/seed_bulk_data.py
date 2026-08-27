import datetime
import random
import time

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.crypto import get_random_string

from apps.accounts.models import User, UserRole
from apps.agencies.models import AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile
from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire,
    CaregiverExperience,
    CaregiverProfile,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverStatus,
    CaregiverWorkPreferences,
    IdentityProfile,
)
from apps.families.models import FamilyPatientLink, FamilyProfile, LinkStatus, PatientCompatibilityQuestionnaire, PatientProfile, RelationType
from apps.locations.models import City, Province

DEMO_PASSWORD = "Demo12345"
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

# Real choice values, verified against the actual model enums — same
# verification discipline as seed_demo_data.py, just applied to a
# much wider random spread here instead of a handful of fixed sets.
GENDER_CHOICES = ["male", "female"]
ACCEPTED_GENDER_CHOICES = ["female_only", "male_only", "no_preference"]
AGE_RANGE_POOL = ["60_70", "70_80", "over_80", "no_preference"]
PHYSICAL_CONDITION_POOL = [
    "independent", "low_mobility", "limited_mobility_bedridden",
    "bedridden_diaper", "alzheimers", "parkinsons", "hospital_companion_needed",
]
CAREGIVER_ACCEPTED_CONDITION_POOL = PHYSICAL_CONDITION_POOL + ["no_preference"]
SHIFT_POOL = ["morning", "afternoon", "night", "24h"]

CAREGIVER_QUESTIONNAIRE_FIELDS = [
    "religious_belief_accommodation", "physical_contact_sensitivity_adaptation",
    "prayer_time_scheduling_flexibility", "traditional_belief_acceptance",
    "family_event_participation", "false_accusation_reaction",
    "confidentiality_commitment", "gender_based_task_flexibility",
    "home_environment_adaptability", "schedule_flexibility_for_family_events",
    "traditional_food_treatment_openness", "personal_conversation_patience",
    "home_organization_adaptability", "cultural_expression_tolerance",
    "unfamiliar_custom_acceptance", "dialect_communication_effort",
]
CAREGIVER_ANSWER_OPTIONS = ["a", "b", "c", "d"]

# Verified against the real per-field scale enums (AgreementScale,
# IntensityScale, YesNoPartial, AcceptanceScale, TimingStrictnessScale,
# DisturbanceScale, ExpressionWillingnessScale) — the exact bug caught
# and fixed in seed_demo_data.py, applied here with real random spread
# per field instead of one fixed answer set.
PATIENT_QUESTIONNAIRE_CHOICES = {
    "religious_beliefs_priority": ["strongly_agree", "somewhat_agree", "somewhat_disagree", "strongly_disagree"],
    "new_treatment_openness": ["very_high", "moderate", "low", "none"],
    "caregiver_as_family_member": ["yes", "no", "partially"],
    "respectful_disagreement_acceptance": ["fully_accept", "mostly_accept", "reluctantly_accept", "reject"],
    "privacy_comfort_with_caregiver": ["yes", "no", "partially"],
    "noise_smell_sensitivity": ["very_high", "moderate", "low", "none"],
    "meal_time_strictness": ["very_strict", "moderately_strict", "flexible", "very_flexible"],
    "special_diet_preference": ["yes", "no", "partially"],
    "medication_timing_priority": ["very_strict", "moderately_strict", "flexible", "very_flexible"],
    "accent_customs_annoyance": ["not_at_all", "slightly", "a_lot", "very_much"],
    "cultural_respect_expectation": ["yes", "no", "partially"],
    "willingness_to_express_opinion": ["very_willing", "somewhat_willing", "reluctant", "very_reluctant"],
}

CAREGIVER_FIRST_NAMES = ["مریم", "زهرا", "سارا", "فاطمه", "علی", "رضا", "حسین", "امیر", "سمیه", "لیلا",
                          "نرگس", "الهام", "محمد", "احمد", "پویا", "کاوه", "شیرین", "مینا", "یاسمن", "بهنام"]
CAREGIVER_LAST_NAMES = ["احمدی", "رضایی", "کریمی", "محمدی", "حسینی", "قاسمی", "نجفی", "صادقی",
                         "موسوی", "نوری", "شریفی", "قربانی", "یوسفی", "رحیمی"]
PATIENT_FULL_NAMES = ["حسن رضوی", "بتول کریمی", "اکبر شریفی", "پروین احمدی", "ابراهیم موسوی", "طاهره نوری",
                       "منصور قاسمی", "زهره صادقی", "داوود نجفی", "کبری رحیمی", "جواد یوسفی", "افسانه قربانی"]


class Command(BaseCommand):
    help = (
        "Bulk seeds a large, realistically diverse dataset (1000 "
        "caregivers / 2000 patients by default) for load-testing "
        "queries and matching at scale — distinct from "
        "seed_demo_data, which seeds a small, memorable dataset for "
        "manual walkthroughs. Uses bulk_create throughout for the "
        "large batches; only the handful of agencies go through "
        "normal .create() (their count is small enough that the "
        "auto-generated access_code / username logic in their own "
        "save() methods isn't a performance concern)."
    )

    def add_arguments(self, parser):
        parser.add_argument("--agencies", type=int, default=15)
        parser.add_argument("--caregivers", type=int, default=1000)
        parser.add_argument("--patients", type=int, default=2000)
        parser.add_argument(
            "--family-ratio", type=float, default=0.5,
            help="Fraction of patients that also get a real family account (default: 0.5)",
        )
        parser.add_argument(
            "--multi-agency-ratio", type=float, default=0.15,
            help="Fraction of caregivers linked to a SECOND agency too, matching the platform's real one-account-many-agencies model (default: 0.15)",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help=(
                "Delete all previously bulk-seeded data first (matched "
                "by the bulk_agency_owner_/bulk_caregiver_/bulk_family_ "
                "username prefixes this command always uses). Without "
                "this, re-running the command a second time will crash "
                "on duplicate phone numbers — every phone/username here "
                "is deterministic based on position, not randomized, so "
                "nothing about a second run is actually new."
            ),
        )

    def handle(self, *args, **options):
        started = time.monotonic()
        random.seed(42)  # reproducible across runs, still realistically varied

        if options["clear"]:
            self._clear_bulk_data()

        # Loaded once, reused throughout — real Iranian province/city
        # reference data already exists via apps.locations's own data
        # migrations, so this assigns real references rather than
        # inventing fake ones. Without this, every patient's
        # province_id is None, which means location_score() returns
        # None for every single caregiver/patient pair — not 0, None
        # — which correctly (per this pipeline's own "missing data is
        # excluded, not zeroed" rule) drops location out of the
        # objective score AND out of the tie-breaker entirely. Fewer
        # independent scoring signals means a small set of caregivers
        # who happen to draw favorable randomness on the REMAINING
        # signals will dominate rankings across many different
        # patients — a real, diagnosed cause of a real symptom (a
        # person testing this noticed 4 of 5 sampled patients getting
        # near-identical top matches), not a bug in the matching
        # logic itself.
        self.cities = list(City.objects.select_related("province").all())
        if not self.cities:
            self.stdout.write(self.style.WARNING(
                "No City/Province data found — location scoring will "
                "stay excluded for all seeded records, same limitation "
                "as before. Run the locations app's own data migrations first."
            ))

        with transaction.atomic():
            agencies = self._create_agencies(options["agencies"])
            caregiver_profiles = self._create_caregivers(options["caregivers"], agencies, options["multi_agency_ratio"])
            patient_count, family_count = self._create_patients(options["patients"], agencies, options["family_ratio"])

        elapsed = time.monotonic() - started
        self.stdout.write(self.style.SUCCESS(
            f"\nDone in {elapsed:.1f}s — {options['agencies']} agencies, "
            f"{len(caregiver_profiles)} caregivers, {patient_count} patients "
            f"({family_count} with a family account). Password for every "
            f"seeded account: {DEMO_PASSWORD}\n"
        ))

    # -----------------------------------------------------------
    # Optional cleanup for re-runs
    # -----------------------------------------------------------

    def _clear_bulk_data(self):
        # Deleting the Users cascades to every related profile/link
        # table (CaregiverProfile, IdentityProfile, AgencyProfile,
        # FamilyProfile, and everything that FKs to those) — matches
        # how every other cascade delete already works in this
        # codebase, nothing bulk-seed-specific about that part.
        deleted, _ = User.objects.filter(
            username__startswith="bulk_agency_owner_"
        ).delete()
        deleted += User.objects.filter(username__startswith="bulk_caregiver_").delete()[0]
        deleted += User.objects.filter(username__startswith="bulk_family_").delete()[0]
        self.stdout.write(f"cleared previous bulk-seeded data ({deleted} rows across all cascaded tables)")

    # -----------------------------------------------------------
    # Agencies — small count, normal .create() is fine
    # -----------------------------------------------------------

    def _create_agencies(self, count):
        agencies = []
        for i in range(count):
            owner = User.objects.create(
                username=f"bulk_agency_owner_{i+1}",
                first_name="مدیر", last_name=f"آژانس {i+1}",
                phone_number=f"0919{500000+i:07d}",
                role=UserRole.AGENCY,
                password=make_password(DEMO_PASSWORD),
            )
            agency = AgencyProfile.objects.create(user=owner, company_name=f"آژانس بار-تست شماره {i+1}")
            agencies.append(agency)
        self.stdout.write(f"created {len(agencies)} agencies")
        return agencies

    # -----------------------------------------------------------
    # Caregivers — bulk_create for every table
    # -----------------------------------------------------------

    def _create_caregivers(self, count, agencies, multi_agency_ratio):
        password_hash = make_password(DEMO_PASSWORD)  # hashed once, reused — real cost is PBKDF2 iterations per call

        users = []
        for i in range(count):
            first_name = random.choice(CAREGIVER_FIRST_NAMES)
            last_name = random.choice(CAREGIVER_LAST_NAMES)
            users.append(User(
                username=f"bulk_caregiver_{i+1}",
                first_name=first_name, last_name=last_name,
                phone_number=f"0912{300000+i:07d}",
                role=UserRole.CAREGIVER,
                password=password_hash,
            ))
        User.objects.bulk_create(users, batch_size=500)
        # bulk_create doesn't guarantee returned objects have real PKs
        # on every backend, but PostgreSQL does — still re-fetch by
        # the deterministic usernames to be certain, rather than trust
        # that guarantee blindly.
        users = list(User.objects.filter(username__startswith="bulk_caregiver_").order_by("id"))

        # Realistic status spread: most approved, a meaningful chunk
        # pending or blacklisted — not just three token examples like
        # the small demo seed, since the whole point here is volume
        # for query stress-testing across every status value.
        profiles = []
        for user in users:
            roll = random.random()
            if roll < 0.75:
                status = CaregiverStatus.APPROVED
            elif roll < 0.90:
                status = CaregiverStatus.PENDING
            elif roll < 0.97:
                status = CaregiverStatus.DRAFT
            else:
                status = CaregiverStatus.SUSPENDED
            profiles.append(CaregiverProfile(
                user=user, status=status,
                blacklist_reason="داده بار-تست — نمونه مسدودشده" if status == CaregiverStatus.SUSPENDED else "",
            ))
        CaregiverProfile.objects.bulk_create(profiles, batch_size=500)
        profiles = list(CaregiverProfile.objects.filter(user__in=users).select_related("user"))
        profile_by_user_id = {p.user_id: p for p in profiles}

        identities = [
            IdentityProfile(user=user, gender=random.choice(GENDER_CHOICES))
            for user in users
        ]
        IdentityProfile.objects.bulk_create(identities, batch_size=500)

        work_prefs = []
        for profile in profiles:
            accepted_ages = random.sample(AGE_RANGE_POOL, k=random.randint(1, len(AGE_RANGE_POOL)))
            accepted_conditions = random.sample(CAREGIVER_ACCEPTED_CONDITION_POOL, k=random.randint(1, 4))
            shifts = random.sample(SHIFT_POOL, k=random.randint(1, 3))
            work_prefs.append(CaregiverWorkPreferences(
                profile=profile,
                accepted_gender=random.choice(ACCEPTED_GENDER_CHOICES),
                accepted_age_ranges=accepted_ages,
                accepted_physical_conditions=accepted_conditions,
                available_shifts=shifts,
            ))
        CaregiverWorkPreferences.objects.bulk_create(work_prefs, batch_size=500)

        if self.cities:
            service_areas = []
            for profile in profiles:
                # 1-3 willing-to-serve cities per caregiver — plausible
                # spread (some caregivers serve one neighborhood, some
                # cover a wider area) rather than either "everywhere"
                # or "nowhere".
                for city in random.sample(self.cities, k=min(random.randint(1, 3), len(self.cities))):
                    service_areas.append(CaregiverServiceArea(profile=profile, province=city.province, city=city))
            CaregiverServiceArea.objects.bulk_create(service_areas, batch_size=500, ignore_conflicts=True)

        questionnaires = []
        for profile in profiles:
            answers = {field: random.choice(CAREGIVER_ANSWER_OPTIONS) for field in CAREGIVER_QUESTIONNAIRE_FIELDS}
            questionnaires.append(CaregiverCompatibilityQuestionnaire(caregiver=profile, **answers))
        CaregiverCompatibilityQuestionnaire.objects.bulk_create(questionnaires, batch_size=500)

        CaregiverExperience.objects.bulk_create([CaregiverExperience(profile=p) for p in profiles], batch_size=500)
        CaregiverSkills.objects.bulk_create([CaregiverSkills(profile=p) for p in profiles], batch_size=500)

        # Agency links — every caregiver gets one primary agency link;
        # a configurable fraction get a SECOND agency link too, since
        # "one caregiver account, multiple agencies, each agency
        # unaware of the others" is the platform's actual confirmed
        # model, not an edge case to skip in load data.
        links = []
        for profile in profiles:
            primary_agency = random.choice(agencies)
            link_status = AgencyLinkStatus.APPROVED if random.random() < 0.85 else AgencyLinkStatus.PENDING
            links.append(AgencyCaregiverLink(agency=primary_agency, caregiver=profile, status=link_status))

            if random.random() < multi_agency_ratio:
                other_choices = [a for a in agencies if a.id != primary_agency.id]
                if other_choices:
                    second_agency = random.choice(other_choices)
                    links.append(AgencyCaregiverLink(
                        agency=second_agency, caregiver=profile,
                        status=AgencyLinkStatus.APPROVED if random.random() < 0.85 else AgencyLinkStatus.PENDING,
                    ))
        AgencyCaregiverLink.objects.bulk_create(links, batch_size=500, ignore_conflicts=True)

        self.stdout.write(f"created {len(profiles)} caregivers with full profiles + {len(links)} agency links")
        return profiles

    # -----------------------------------------------------------
    # Patients + families — bulk_create for every table
    # -----------------------------------------------------------

    def _create_patients(self, count, agencies, family_ratio):
        password_hash = make_password(DEMO_PASSWORD)

        patients = []
        for i in range(count):
            birth_year = random.randint(1930, 1958)
            city = random.choice(self.cities) if self.cities else None
            patients.append(PatientProfile(
                full_name=random.choice(PATIENT_FULL_NAMES),
                gender=random.choice(GENDER_CHOICES),
                birth_date=datetime.date(birth_year, random.randint(1, 12), random.randint(1, 28)),
                physical_condition=random.choice(PHYSICAL_CONDITION_POOL),
                needed_shifts=random.sample(SHIFT_POOL, k=random.randint(1, 2)),
                province=city.province if city else None,
                city=city,
                # save() normally auto-generates this; bulk_create
                # skips save() entirely, so it's generated inline here
                # instead, following the exact same format/alphabet as
                # the real _generate_unique_code() helper.
                access_code=f"ELD-{get_random_string(6, _CODE_ALPHABET)}",
            ))
        PatientProfile.objects.bulk_create(patients, batch_size=500, ignore_conflicts=True)
        patients = list(PatientProfile.objects.filter(access_code__in=[p.access_code for p in patients]))

        questionnaires = []
        for patient in patients:
            answers = {field: random.choice(options) for field, options in PATIENT_QUESTIONNAIRE_CHOICES.items()}
            questionnaires.append(PatientCompatibilityQuestionnaire(patient=patient, **answers))
        PatientCompatibilityQuestionnaire.objects.bulk_create(questionnaires, batch_size=500)

        patient_links = [
            AgencyPatientLink(agency=random.choice(agencies), patient=patient, status=AgencyLinkStatus.APPROVED)
            for patient in patients
        ]
        AgencyPatientLink.objects.bulk_create(patient_links, batch_size=500, ignore_conflicts=True)

        # Families — only for the configured fraction of patients.
        family_targets = random.sample(patients, k=int(len(patients) * family_ratio))

        family_users = []
        for i, patient in enumerate(family_targets):
            family_users.append(User(
                username=f"bulk_family_{i+1}",
                first_name=random.choice(CAREGIVER_FIRST_NAMES), last_name=patient.full_name.split()[-1],
                phone_number=f"0913{700000+i:07d}",
                role=UserRole.FAMILY,
                password=password_hash,
            ))
        User.objects.bulk_create(family_users, batch_size=500)
        family_users = list(User.objects.filter(username__startswith="bulk_family_").order_by("id"))

        family_profiles = [
            FamilyProfile(
                user=user, display_name=f"{user.first_name} {user.last_name}",
                access_code=f"FAM-{get_random_string(6, _CODE_ALPHABET)}",
            )
            for user in family_users
        ]
        FamilyProfile.objects.bulk_create(family_profiles, batch_size=500, ignore_conflicts=True)
        family_profiles = list(FamilyProfile.objects.filter(user__in=family_users))

        family_patient_links = []
        agency_family_links = []
        # One query for every patient's agency, not one query per
        # family target inside the loop below — the whole point of
        # bulk_create is defeated if this step reintroduces an N+1.
        patient_agency_by_id = dict(
            AgencyPatientLink.objects.filter(patient__in=family_targets).values_list("patient_id", "agency_id")
        )
        for family, patient in zip(family_profiles, family_targets):
            family_patient_links.append(FamilyPatientLink(
                family=family, patient=patient, relation=random.choice(list(RelationType.values)),
                status=LinkStatus.APPROVED,
            ))
            patient_agency_id = patient_agency_by_id.get(patient.id)
            if patient_agency_id:
                agency_family_links.append(AgencyFamilyLink(agency_id=patient_agency_id, family=family, status=AgencyLinkStatus.APPROVED))

        FamilyPatientLink.objects.bulk_create(family_patient_links, batch_size=500, ignore_conflicts=True)
        AgencyFamilyLink.objects.bulk_create(agency_family_links, batch_size=500, ignore_conflicts=True)

        self.stdout.write(f"created {len(patients)} patients + {len(family_profiles)} family accounts")
        return len(patients), len(family_profiles)
