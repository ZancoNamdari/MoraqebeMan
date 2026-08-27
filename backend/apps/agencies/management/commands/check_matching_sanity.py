import time

from django.core.management.base import BaseCommand

from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyPatientLink, AgencyProfile
from apps.care.matching import suggest_caregivers_for_agency_patient, suggest_caregivers_for_patient
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import PatientProfile


class Command(BaseCommand):
    help = (
        "Sanity-checks the matching pipeline against whatever is "
        "actually in the database right now — not a throwaway test "
        "DB. Checks things automated tests can't: is it still fast "
        "at your real data volume, and does it behave sensibly on "
        "real (messy, randomly-seeded) records, not just the "
        "controlled cases the test suite constructs."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--patient-id", type=int, default=None,
            help="Check one specific patient instead of a random sample",
        )
        parser.add_argument("--sample-size", type=int, default=5)

    def handle(self, *args, **options):
        self.failures = []

        if options["patient_id"]:
            patients = list(PatientProfile.objects.filter(id=options["patient_id"]))
            if not patients:
                self.stderr.write(self.style.ERROR(f"No patient with id={options['patient_id']}"))
                return
        else:
            patients = list(PatientProfile.objects.order_by("?")[: options["sample_size"]])

        if not patients:
            self.stderr.write(self.style.WARNING("No patients in the database — seed some data first."))
            return

        self.stdout.write(f"Checking platform-wide matching for {len(patients)} patient(s)...\n")
        top5_sets = []
        for patient in patients:
            top5_sets.append(self._check_platform_wide(patient))

        self._check_result_diversity(top5_sets)

        agency_patient = AgencyPatientLink.objects.filter(status=AgencyLinkStatus.APPROVED).order_by("?").first()
        if agency_patient:
            self.stdout.write("\nChecking agency-scoped matching...\n")
            self._check_agency_scoped(agency_patient.agency, agency_patient.patient)
        else:
            self.stdout.write(self.style.WARNING("\nNo AgencyPatientLink found — skipping agency-scoped check."))

        self.stdout.write("\n" + "=" * 60)
        if self.failures:
            self.stdout.write(self.style.ERROR(f"{len(self.failures)} CHECK(S) FAILED:"))
            for f in self.failures:
                self.stdout.write(self.style.ERROR(f"  - {f}"))
        else:
            self.stdout.write(self.style.SUCCESS("All sanity checks passed."))

    # -----------------------------------------------------------

    def _check_platform_wide(self, patient):
        started = time.monotonic()
        results = suggest_caregivers_for_patient(patient, limit=10)
        elapsed = time.monotonic() - started

        label = f"patient #{patient.id} ({patient.full_name})"
        self.stdout.write(f"  {label}: {len(results)} suggestions in {elapsed*1000:.0f}ms")

        if elapsed > 3.0:
            self._fail(f"{label}: took {elapsed:.1f}s — that's slow enough to matter at real caregiver counts; check for an N+1 query in the pipeline")

        self._check_common(results, label)
        return {r["caregiver_user_id"] for r in results[:5]}

    def _check_result_diversity(self, top5_sets):
        """
        Directly checks for the exact symptom that motivated adding
        this: if most different patients' top-5 caregiver lists are
        near-identical, that's a real signal worth investigating —
        either genuinely diverse seed data producing legitimately
        similar rankings by chance, or (as actually happened once) a
        missing scoring dimension (no location data) collapsing the
        number of independent signals differentiating caregivers.
        This can't tell you WHICH cause it is on its own — only that
        it's worth looking at.
        """
        if len(top5_sets) < 2:
            return

        overlaps = []
        for i in range(len(top5_sets)):
            for j in range(i + 1, len(top5_sets)):
                if not top5_sets[i] or not top5_sets[j]:
                    continue
                shared = len(top5_sets[i] & top5_sets[j])
                overlaps.append(shared / max(len(top5_sets[i]), 1))

        if not overlaps:
            return

        avg_overlap = sum(overlaps) / len(overlaps)
        self.stdout.write(f"\n  average top-5 overlap across sampled patients: {avg_overlap*100:.0f}%")
        if avg_overlap >= 0.8:
            self.stdout.write(self.style.WARNING(
                "    HIGH OVERLAP — most patients are getting nearly the same top caregivers "
                "regardless of their own needs. Common real cause: a scoring dimension "
                "(e.g. location — check whether patients actually have province/city set, "
                "and caregivers have real CaregiverServiceArea records) is missing data for "
                "everyone and dropping out of every score, leaving too few independent "
                "signals to differentiate candidates. Not automatically a bug in the matching "
                "code itself — check the DATA first."
            ))

    def _check_agency_scoped(self, agency, patient):
        started = time.monotonic()
        results = suggest_caregivers_for_agency_patient(agency, patient)
        elapsed = time.monotonic() - started

        label = f"agency-scoped: {agency.company_name} / patient #{patient.id}"
        self.stdout.write(f"  {label}: {len(results)} suggestions in {elapsed*1000:.0f}ms")

        self._check_common(results, label)

        # The one check that only makes sense for the agency-scoped
        # path: every suggested caregiver must actually belong to
        # THIS agency's own approved roster — a violation here is a
        # real cross-tenant leak, the most serious possible failure
        # this command could find.
        allowed_ids = set(
            AgencyCaregiverLink.objects.filter(
                agency=agency, status=AgencyLinkStatus.APPROVED,
            ).values_list("caregiver__user_id", flat=True)
        )
        for r in results:
            if r["caregiver_user_id"] not in allowed_ids:
                self._fail(f"{label}: caregiver_user_id={r['caregiver_user_id']} suggested but NOT in this agency's roster — cross-tenant leak")

    def _check_common(self, results, label):
        if not results:
            return  # empty is a legitimate outcome (e.g. no approved caregivers at all), not a failure

        scores = [r["mcdm_score"] for r in results if r["mcdm_score"] is not None]

        for score in scores:
            if not (0 <= score <= 100):
                self._fail(f"{label}: mcdm_score {score} out of the expected [0, 100] range")

        if scores != sorted(scores, reverse=True):
            self._fail(f"{label}: results are not sorted descending by mcdm_score — {scores}")

        suspended_ids = set(
            CaregiverProfile.objects.filter(status=CaregiverStatus.SUSPENDED).values_list("user_id", flat=True)
        )
        for r in results:
            if r["caregiver_user_id"] in suspended_ids:
                self._fail(f"{label}: a SUSPENDED (blacklisted) caregiver_user_id={r['caregiver_user_id']} was suggested — blacklist exclusion is broken")

        if len(scores) >= 3 and len(set(scores)) == 1:
            self.stdout.write(self.style.WARNING(
                f"    note: all {len(scores)} scores are identical ({scores[0]}) — "
                "not necessarily wrong, but worth a manual look if this keeps happening"
            ))

    def _fail(self, message):
        self.failures.append(message)
        self.stdout.write(self.style.ERROR(f"    FAIL: {message}"))
