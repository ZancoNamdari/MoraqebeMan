from django.db import models
from django_jalali.db import models as jmodels

# Deliberately a small, separate app rather than adding these models to
# either apps.caregivers or apps.families — this is fundamentally about
# the RELATIONSHIP between the two, and neither app currently imports
# from the other. Keeping that decoupling rather than introducing a
# dependency in either direction just to hang these two models
# somewhere.


class AssignmentStatus(models.TextChoices):
    ACTIVE = "active", "فعال"
    ENDED = "ended", "پایان‌یافته"


class CaregiverAssignment(models.Model):
    """
    Which caregiver is actually serving which patient — the piece this
    whole platform was missing until now. Everything downstream (a
    caregiver submitting a care report, a family seeing who's actually
    caring for their relative) depends on this existing first.

    Created by a supervisor for now (matching the same "temp bulk
    tooling" pattern already established for caregiver data entry) —
    not a self-service marketplace where a family browses and picks a
    caregiver directly. That's a real, deliberately different, larger
    feature this doesn't attempt to be.
    """
    caregiver = models.ForeignKey(
        "caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="assignments", verbose_name="مراقب")
    patient = models.ForeignKey(
        "families.PatientProfile", on_delete=models.CASCADE, related_name="assignments", verbose_name="بیمار")
    assigned_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assignments_made", verbose_name="تخصیص‌دهنده")
    status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE, verbose_name="وضعیت")
    notes = models.TextField(blank=True, verbose_name="یادداشت")
    assigned_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="زمان تخصیص")
    ended_at = jmodels.jDateTimeField(null=True, blank=True, verbose_name="زمان پایان")

    class Meta:
        verbose_name = "تخصیص مراقب"
        verbose_name_plural = "تخصیص‌های مراقب"
        # A caregiver CAN be reassigned to the same patient again after
        # an earlier assignment ended (status changes to ENDED first) —
        # this only blocks having two simultaneously ACTIVE assignments
        # for the same pair, not assignment history in general.
        unique_together = ("caregiver", "patient", "status")
        ordering = ["-assigned_at"]

    def end(self):
        from django.utils import timezone
        self.status = AssignmentStatus.ENDED
        self.ended_at = timezone.now()
        self.save(update_fields=["status", "ended_at"])

    def __str__(self):
        return f"{self.caregiver} → {self.patient} ({self.get_status_display()})"


class CareLogCategory(models.TextChoices):
    GENERAL = "general", "یادداشت عمومی"
    MEDICATION = "medication", "دارو"
    MEAL = "meal", "تغذیه"
    MOBILITY = "mobility", "تحرک و جابجایی"
    VITALS = "vitals", "علائم حیاتی"
    INCIDENT = "incident", "حادثه یا نگرانی"


class CareLogEntry(models.Model):
    """
    One care report/observation from a caregiver about a patient they
    are (or were) assigned to. caregiver/patient are stored directly
    here too, not just reachable through `assignment` — so a log entry
    still correctly shows who it's about even if the underlying
    assignment is later ended or reassigned, and so the family's
    timeline view doesn't need a join through CaregiverAssignment just
    to list entries for one patient.
    """
    assignment = models.ForeignKey(CaregiverAssignment, on_delete=models.CASCADE, related_name="log_entries", verbose_name="تخصیص")
    caregiver = models.ForeignKey("caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="care_log_entries", verbose_name="مراقب")
    patient = models.ForeignKey("families.PatientProfile", on_delete=models.CASCADE, related_name="care_log_entries", verbose_name="بیمار")
    category = models.CharField(max_length=20, choices=CareLogCategory.choices, default=CareLogCategory.GENERAL, verbose_name="دسته")
    note = models.TextField(verbose_name="گزارش")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "گزارش مراقبت"
        verbose_name_plural = "گزارش‌های مراقبت"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_category_display()} — {self.patient} — {self.created_at}"


class CaregiverReview(models.Model):
    """
    A family member or the patient themselves rating a caregiver, tied
    to a specific assignment — you can only review someone you
    actually had assigned to you, not a caregiver in the abstract.

    Deliberately allows more than one review per assignment (one per
    reviewer, not one per assignment overall) — this platform already
    established that multiple family members can have equal, parallel
    access to one patient (no single gatekeeper), and a caregiver
    review is exactly the kind of thing different family members might
    genuinely experience differently. unique_together prevents the
    same person spamming repeat reviews for the same assignment, not
    prevents a second family member from also weighing in.
    """
    assignment = models.ForeignKey(CaregiverAssignment, on_delete=models.CASCADE, related_name="reviews", verbose_name="تخصیص")
    caregiver = models.ForeignKey("caregivers.CaregiverProfile", on_delete=models.CASCADE, related_name="reviews", verbose_name="مراقب")
    patient = models.ForeignKey("families.PatientProfile", on_delete=models.CASCADE, related_name="reviews", verbose_name="بیمار")
    reviewer = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="caregiver_reviews_written", verbose_name="ثبت‌کننده نظر",
    )
    rating = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)], verbose_name="امتیاز",
        help_text="از ۱ (ضعیف) تا ۵ (عالی)",
    )
    comment = models.TextField(blank=True, verbose_name="نظر")
    created_at = jmodels.jDateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")

    class Meta:
        unique_together = ("assignment", "reviewer")
        verbose_name = "نظر درباره مراقب"
        verbose_name_plural = "نظرات درباره مراقبان"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.rating}/5 — {self.caregiver} ({self.patient})"


class TraitName(models.TextChoices):
    """
    The 16 measurable psychosocial traits the matching engine actually
    operates on — not the raw A/B/C/D answers themselves. Matches the
    spec exactly: an option is never inherently "good" or "bad" (a
    caregiver with a strong professional boundary isn't worse than one
    without — some patients want exactly that), so every answer gets
    converted into specific trait values via QuestionTraitMapping
    below, rather than scored directly.
    """
    RELIGIOUS_FLEXIBILITY = "religious_flexibility", "انعطاف مذهبی"
    GENDER_SENSITIVITY = "gender_sensitivity", "حساسیت جنسیتی"
    RITUAL_FLEXIBILITY = "ritual_flexibility", "انعطاف مناسکی"
    TRADITIONAL_BELIEF_TOLERANCE = "traditional_belief_tolerance", "تحمل باور سنتی"
    PROFESSIONAL_BOUNDARY = "professional_boundary", "مرز حرفه‌ای"
    PRIVACY_ORIENTATION = "privacy_orientation", "جهت‌گیری حریم خصوصی"
    GENDER_ROLE_FLEXIBILITY = "gender_role_flexibility", "انعطاف نقش جنسیتی"
    EMOTIONAL_INVOLVEMENT = "emotional_involvement", "درگیری عاطفی"
    ENVIRONMENT_TOLERANCE = "environment_tolerance", "تحمل محیط"
    SCHEDULE_FLEXIBILITY = "schedule_flexibility", "انعطاف زمان‌بندی"
    TRADITIONAL_MEDICINE_ORIENTATION = "traditional_medicine_orientation", "جهت‌گیری طب سنتی"
    EMOTIONAL_INTERACTION_PREFERENCE = "emotional_interaction_preference", "ترجیح تعامل عاطفی"
    ORDERLINESS_TOLERANCE = "orderliness_tolerance", "تحمل نظم"
    CULTURAL_TOLERANCE = "cultural_tolerance", "تحمل فرهنگی"
    OFFENSIVE_SPEECH_TOLERANCE = "offensive_speech_tolerance", "تحمل گفتار ناخوشایند"
    RITUAL_TOLERANCE = "ritual_tolerance", "تحمل آیینی"
    LANGUAGE_DIALECT_FLEXIBILITY = "language_dialect_flexibility", "انعطاف زبان و گویش"


class TraitDimension(models.TextChoices):
    """The 4 dimensions traits roll up into, matching both
    questionnaires' section structure exactly."""
    CULTURAL_RITUAL = "cultural_ritual", "عقیدتی و مناسکی"
    VALUES_PROFESSIONAL = "values_professional", "ارزش‌های بنیادین و مرزهای حرفه‌ای"
    LIFESTYLE = "lifestyle", "سبک زندگی و شرایط محیطی"
    CULTURAL_FLEXIBILITY = "cultural_flexibility", "متاانعطاف‌پذیری و هوش فرهنگی"


class MatchingProfileSide(models.TextChoices):
    PATIENT = "patient", "بیمار"
    CAREGIVER = "caregiver", "مراقب"


class QuestionTraitMapping(models.Model):
    """
    The configurable Mapping Table the spec requires — a real database
    table, not hardcoded Python, specifically so it can be tuned later
    (per the source spec: once real usage data exists, weights and
    mappings get refined with AHP, replacing these initial values
    without a code deploy). An answer is never scored directly; it's
    looked up here to find which trait(s) it represents and at what
    strength.

    question_field holds the actual model field name from either
    questionnaire (e.g. "religious_belief_accommodation" for the
    caregiver's Q1, or "religious_beliefs_priority" for the patient's
    corresponding question) — so a mapping row is only ever meaningful
    together with profile_type, not on its own.
    """
    profile_type = models.CharField(max_length=10, choices=MatchingProfileSide.choices, verbose_name="نوع پروفایل")
    question_field = models.CharField(max_length=100, verbose_name="فیلد سؤال")
    answer_option = models.CharField(max_length=30, verbose_name="گزینه پاسخ")
    trait = models.CharField(max_length=50, choices=TraitName.choices, verbose_name="ویژگی")
    value = models.PositiveSmallIntegerField(verbose_name="مقدار (۰ تا ۱۰۰)")

    class Meta:
        unique_together = ("profile_type", "question_field", "answer_option", "trait")
        verbose_name = "نگاشت سؤال به ویژگی"
        verbose_name_plural = "نگاشت‌های سؤال به ویژگی"

    def __str__(self):
        return f"{self.profile_type}/{self.question_field}={self.answer_option} -> {self.trait}={self.value}"
