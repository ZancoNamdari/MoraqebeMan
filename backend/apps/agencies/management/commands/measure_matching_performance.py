import statistics
import time

from django.core.management.base import BaseCommand
from apps.agencies.models import AgencyCaregiverLink, AgencyLinkStatus, AgencyPatientLink
from apps.care.matching import suggest_caregivers_for_agency_patient, suggest_caregivers_for_patient
from apps.families.models import PatientProfile


class Command(BaseCommand):
    help = (
        "Measures REAL wall-clock response time for the actual "
        "user-facing 'find a suitable caregiver' flow — agency-scoped "
        "matching, since that's what a real user hits, not the "
        "platform-wide staff-only endpoint. Reports percentiles "
        "(p50/p90/p95/p99), not just an average, because an average "
        "hides exactly the slow-tail requests that make a feature "
        "feel broken for some users while looking fine on a dashboard."
    )

    def add_arguments(self, parser):
        parser.add_argument("--sample-size", type=int, default=50)
        parser.add_argument(
            "--threshold-ms", type=int, default=500,
            help="p95 above this is reported as a FAIL, not just a number (default: 500ms — a reasonable bar for something that should feel instant to a person clicking a button)",
        )
        parser.add_argument(
            "--compare-platform-wide", action="store_true",
            help="Also measure the platform-wide (staff-only) endpoint on the same patients, for comparison",
        )
        parser.add_argument(
            "--profile", action="store_true",
            help=(
                "Run cProfile on ONE platform-wide matching call (the "
                "slower endpoint) and print the top time-consuming "
                "functions — real evidence of where time actually "
                "goes, instead of guessing which part of the pipeline "
                "to optimize next."
            ),
        )

    def handle(self, *args, **options):
        threshold_seconds = options["threshold_ms"] / 1000

        agency_patient_links = list(
            AgencyPatientLink.objects.filter(status=AgencyLinkStatus.APPROVED)
            .select_related("agency", "patient")
            .order_by("?")[: options["sample_size"]]
        )

        if not agency_patient_links:
            self.stderr.write(self.style.WARNING(
                "No AgencyPatientLink records found — seed some data first "
                "(seed_demo_data or seed_bulk_data)."
            ))
            return

        if options["profile"]:
            self._run_profile(agency_patient_links[0].patient)
            return

        self.stdout.write(f"Measuring agency-scoped matching for {len(agency_patient_links)} real patient(s)...\n")

        agency_scoped_timings = []
        pool_sizes = []
        for link in agency_patient_links:
            pool_size = AgencyCaregiverLink.objects.filter(
                agency=link.agency, status=AgencyLinkStatus.APPROVED,
            ).count()
            pool_sizes.append(pool_size)

            started = time.monotonic()
            suggest_caregivers_for_agency_patient(link.agency, link.patient)
            elapsed = time.monotonic() - started
            agency_scoped_timings.append(elapsed)

        self._report("Agency-scoped matching (the real user-facing flow)", agency_scoped_timings, threshold_seconds)
        self._report_pool_size_correlation(agency_scoped_timings, pool_sizes)

        if options["compare_platform_wide"]:
            self.stdout.write("\nMeasuring platform-wide matching on the same patients (staff-only endpoint, for comparison)...\n")
            platform_wide_timings = []
            for link in agency_patient_links:
                started = time.monotonic()
                suggest_caregivers_for_patient(link.patient)
                platform_wide_timings.append(time.monotonic() - started)
            self._report("Platform-wide matching (staff panels only)", platform_wide_timings, threshold_seconds)

    def _run_profile(self, patient):
        import cProfile
        import io
        import pstats

        self.stdout.write(f"Profiling ONE platform-wide matching call for patient #{patient.id}...\n")

        profiler = cProfile.Profile()
        profiler.enable()
        suggest_caregivers_for_patient(patient)
        profiler.disable()

        stream = io.StringIO()
        stats = pstats.Stats(profiler, stream=stream).sort_stats("cumulative")
        stats.print_stats(25)
        self.stdout.write(stream.getvalue())
        self.stdout.write(self.style.SUCCESS(
            "\nLook at 'cumtime' (cumulative time) on the rows near the "
            "top — that's the real evidence of where time is actually "
            "going, not a guess. Whatever function has high 'tottime' "
            "(time in that function itself, not its sub-calls) AND is "
            "called once per candidate is the real next thing worth "
            "optimizing."
        ))


        timings_ms = sorted(t * 1000 for t in timings)
        p50 = statistics.median(timings_ms)
        p90 = timings_ms[int(len(timings_ms) * 0.90)] if len(timings_ms) > 1 else timings_ms[0]
        p95 = timings_ms[int(len(timings_ms) * 0.95)] if len(timings_ms) > 1 else timings_ms[0]
        p99 = timings_ms[int(len(timings_ms) * 0.99)] if len(timings_ms) > 1 else timings_ms[0]

        self.stdout.write(f"{label}:")
        self.stdout.write(f"  min={timings_ms[0]:.0f}ms  p50={p50:.0f}ms  p90={p90:.0f}ms  p95={p95:.0f}ms  p99={p99:.0f}ms  max={timings_ms[-1]:.0f}ms")

        if p95 > threshold_seconds * 1000:
            self.stdout.write(self.style.ERROR(
                f"  FAIL: p95 ({p95:.0f}ms) exceeds the {threshold_seconds*1000:.0f}ms real-time threshold. "
                f"Most requests may feel fine, but a meaningful fraction of real users will notice a delay."
            ))
        else:
            self.stdout.write(self.style.SUCCESS(f"  PASS: p95 is within the {threshold_seconds*1000:.0f}ms threshold."))

    def _report_pool_size_correlation(self, timings, pool_sizes):
        """
        The actual answer to "how does this change as scale grows":
        response time for agency-scoped matching depends on THAT
        AGENCY'S roster size, not total platform caregiver count —
        a real, structural reason agency-scoped matching stays fast
        even as the platform grows to many agencies, unlike the
        platform-wide endpoint which scores against every approved
        caregiver on the entire platform regardless of which agency
        asked. This prints the actual pairs so that relationship is
        visible directly in your own data, not just asserted.
        """
        if len(set(pool_sizes)) < 2:
            self.stdout.write(
                "\n  (all sampled agencies had the same roster size — "
                "run with more agencies of varying size to see the "
                "pool-size/timing relationship directly)"
            )
            return

        pairs = sorted(zip(pool_sizes, (t * 1000 for t in timings)))
        self.stdout.write("\n  roster size -> response time (sorted by roster size):")
        # Show a spread across the range, not every single row, so this stays readable at sample-size=50+.
        step = max(1, len(pairs) // 10)
        for pool_size, ms in pairs[::step]:
            self.stdout.write(f"    {pool_size:>4} caregivers in roster -> {ms:.0f}ms")
