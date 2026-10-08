"""
تکمیل پروفایل مراقبانِ تستی (seed) تا صفحه‌ی پروفایل عمومی پر و واقع‌نما دیده شود:
مشخصات فردی، نوع خدمت و زیرشاخه، تجربه، مهارت‌ها، شرایط همکاری، نتیجه‌ی سوال‌های
موقعیتی (trait_profiles)، عکس پروفایل (تصویر تصویرسازی‌شده‌ی ساختگی — نه عکس آدم
واقعی) و نظرهای فارسیِ ساختگی با امتیاز.

  python manage.py enrich_fake_caregivers --approve

- فقط کاربرانی که username آن‌ها با bulk_caregiver_ یا demo_caregiver_ شروع می‌شود.
- امن برای اجرای دوباره: فقط فیلدهای خالی پر می‌شوند (مگر با --force).
- --approve: مراقبانِ draft/pending را approved می‌کند (تا در فهرست خانواده‌ها
  دیده شوند)؛ مراقبان تعلیق‌شده/ردشده دست نمی‌خورند.
"""
import io
import random
from datetime import timedelta

import jdatetime
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User, UserRole
from apps.care.models import AssignmentStatus, CaregiverAssignment, CaregiverReview
from apps.caregivers import choices as c
from apps.caregivers.models import (
    CaregiverCompatibilityQuestionnaire,
    CaregiverDocumentReviewStatus,
    CaregiverDocumentType,
    CaregiverDocumentUpload,
    CaregiverExperience,
    CaregiverProfile,
    CaregiverServiceArea,
    CaregiverSkills,
    CaregiverStatus,
    CaregiverWorkPreferences,
    IdentityProfile,
)
from apps.families.models import PatientProfile
from apps.locations.models import City

FAKE_PREFIXES = ("bulk_caregiver_", "demo_caregiver_")

FIRST_F = ["مریم", "زهرا", "سارا", "فاطمه", "سمیه", "لیلا", "نرگس", "الهام", "شیرین", "مینا", "یاسمن", "نسترن"]
FIRST_M = ["علی", "رضا", "حسین", "امیر", "محمد", "احمد", "پویا", "کاوه", "بهنام", "مهدی"]
LAST = ["احمدی", "رضایی", "کریمی", "محمدی", "حسینی", "قاسمی", "نجفی", "صادقی", "موسوی", "نوری", "شریفی", "قربانی", "یوسفی", "رحیمی"]

FIELDS_OF_STUDY = ["پرستاری", "مامایی", "علوم تغذیه", "روان‌شناسی", "مددکاری اجتماعی", "حسابداری", "علوم تربیتی", "فنی و حرفه‌ای"]

# عنوان و ویژگی‌های (key/label) هر نقش — هم‌خوان با lib/trait-model*.ts پنل آژانس.
TRAITS = {
    "salmandyar": ("سالمندیار", [
        ("empathy", "همدلی و مهربانی"), ("dignity", "احترام به شأن و استقلال"), ("patience", "صبر و حوصله"),
        ("calmness", "آرامش در شرایط اضطراری"), ("attentiveness", "دقت و مشاهده‌گری"),
        ("adherence", "پایبندی به دستورات مراقبتی"), ("companionship", "هم‌صحبتی و همراهی"),
        ("hygiene", "بهداشت و نظافت"), ("responsibility", "مسئولیت‌پذیری"), ("trustworthiness", "قابل اعتماد بودن"),
        ("communication", "ارتباط با خانواده و تیم درمان"), ("punctuality", "وقت‌شناسی"),
    ]),
    "newborn": ("مادریار — نوزاد", [
        ("gentleness", "لطافت و دقت در برخورد با نوزاد"), ("calmness", "آرامش در شرایط پراسترس"),
        ("patience", "صبر و حوصله"), ("attentiveness", "دقت و پایش علائم نوزاد"), ("safety", "ایمنی نوزاد"),
        ("hygiene", "بهداشت"), ("maternal_empathy", "همدلی با مادر"), ("responsibility", "مسئولیت‌پذیری"),
        ("trustworthiness", "قابل اعتماد بودن"),
    ]),
    "koodakyar": ("مادریار — کودک", [
        ("kindness", "مهربانی"), ("patience", "صبر و حوصله"), ("organization", "نظم و سازماندهی"),
        ("trustworthiness", "قابل اعتماد بودن"), ("responsibility", "مسئولیت‌پذیری"), ("creativity", "خلاقیت"),
        ("cheerfulness", "شادابی"), ("politeness", "ادب"), ("punctuality", "وقت‌شناسی"),
    ]),
    "cleaning": ("امور منزل — نظافت", [
        ("precision", "دقت و توجه به جزئیات"), ("discipline", "نظم و ترتیب کار"), ("punctuality", "وقت‌شناسی"),
        ("hygiene", "رعایت بهداشت"), ("trustworthiness", "امانت‌داری"), ("privacy", "رعایت حریم خصوصی"),
        ("respect", "برخورد محترمانه"), ("stamina", "تحمل کار فیزیکی و طولانی"),
    ]),
    "cooking": ("امور منزل — آشپزی", [
        ("foodHygiene", "بهداشت مواد غذایی"), ("taste", "خوش‌سلیقگی و طعم"), ("planning", "برنامه‌ریزی و زمان‌بندی"),
        ("kitchenOrder", "نظم و تمیزی آشپزخانه"), ("dietCare", "توجه به رژیم و حساسیت"), ("punctuality", "وقت‌شناسی"),
        ("trustworthiness", "امانت‌داری"),
    ]),
    "nurse": ("پرستار", [
        ("clinicalJudgment", "قضاوت بالینی و اولویت‌بندی"), ("calmness", "آرامش در شرایط اورژانسی"),
        ("medication", "دقت در دارو و دستور پزشک"), ("infectionControl", "کنترل عفونت و بهداشت"),
        ("observation", "مشاهده و پایش بیمار"), ("empathy", "همدلی و آرام کردن بیمار"),
        ("dignity", "حفظ شأن و حریم بیمار"), ("confidentiality", "رازداری بیمار"), ("teamwork", "همکاری با تیم درمان"),
    ]),
    "behyar": ("بهیار", [
        ("dailyCare", "مراقبت از امور روزمره"), ("hygiene", "بهداشت و پیشگیری از عفونت"),
        ("dignity", "حفظ شأن و حریم بیمار"), ("empathy", "همدلی و مهربانی"), ("patience", "صبر و حوصله"),
        ("observation", "مشاهده و گزارش به پرستار"), ("teamwork", "همکاری در تیم"),
        ("trustworthiness", "امانت‌داری و رازداری"), ("punctuality", "وقت‌شناسی"),
    ]),
}

COMMENTS = {
    5: [
        "خیلی مهربان و دلسوز بودن، مادرم از ایشون راضی بود.", "کارشون عالی بود، وقت‌شناس و با حوصله.",
        "بسیار خوش‌برخورد و حرفه‌ای. از همکاری باهاشون خیلی راضی هستیم.", "واقعاً قابل اعتماد بودن و با پدرم خیلی خوب کنار اومدن.",
        "دقیق و منظم؛ همه‌ی کارها سر وقت انجام می‌شد. ممنونم.", "هم مهربون بودن هم کارشون رو خوب بلد بودن. حتماً پیشنهاد می‌کنم.",
        "از همه نظر عالی بودن، خانواده‌ی ما رو خیلی آروم کردن.", "صبر و حوصله‌ی زیادی داشتن و با سالمند مثل اعضای خانواده رفتار کردن.",
    ],
    4: [
        "در کل خوب بودن و کارشون رو درست انجام دادن.", "راضی بودیم؛ فقط چند باری کمی دیر رسیدن.",
        "برخورد خوب و محترمانه‌ای داشتن، کارشون تمیز بود.", "خوب و مسئولیت‌پذیر بودن. ممنون.",
    ],
    3: ["متوسط بود؛ کارها انجام می‌شد ولی می‌تونست بهتر باشه.", "قابل قبول بود، ارتباطشون با ما می‌تونست بیشتر باشه."],
    2: ["انتظار بیشتری داشتیم، چند بار هماهنگی‌ها به‌هم خورد."],
}

AVATAR_BG = [(214, 234, 248), (252, 228, 236), (226, 240, 217), (255, 236, 205), (232, 224, 247), (214, 240, 235), (250, 222, 214)]
SKIN = [(246, 214, 189), (234, 190, 154), (214, 164, 124), (198, 148, 108)]
HAIR_F = [(40, 30, 28), (75, 52, 40), (110, 78, 52), (28, 24, 30), (150, 112, 70)]
SHIRT = [(70, 130, 180), (180, 90, 110), (90, 150, 120), (210, 150, 70), (120, 100, 170), (60, 140, 140)]


def make_avatar(rng, female, size=480):
    """تصویرسازی ساده‌ی ساختگی (سرِ دایره‌ای + شانه) — عمداً عکس واقعی نیست."""
    from PIL import Image, ImageDraw

    s = size
    img = Image.new("RGB", (s, s), rng.choice(AVATAR_BG))
    d = ImageDraw.Draw(img)
    skin, hair, shirt = rng.choice(SKIN), rng.choice(HAIR_F), rng.choice(SHIRT)
    cx = s // 2
    if female:
        # موی بلند پشت سر (قبل از لباس و گردن، تا زیر چانه «ریش» دیده نشود)
        d.ellipse([cx - 0.27 * s, 0.14 * s, cx + 0.27 * s, 0.80 * s], fill=hair)
    # شانه / لباس
    d.ellipse([cx - 0.42 * s, 0.70 * s, cx + 0.42 * s, 1.35 * s], fill=shirt)
    # گردن
    d.rectangle([cx - 0.06 * s, 0.56 * s, cx + 0.06 * s, 0.76 * s], fill=skin)
    # سر
    d.ellipse([cx - 0.20 * s, 0.22 * s, cx + 0.20 * s, 0.64 * s], fill=skin)
    # موی بالای پیشانی
    if female:
        d.pieslice([cx - 0.22 * s, 0.16 * s, cx + 0.22 * s, 0.50 * s], 180, 360, fill=hair)
    else:
        d.pieslice([cx - 0.21 * s, 0.17 * s, cx + 0.21 * s, 0.45 * s], 180, 360, fill=hair)
    # چشم و لبخند
    ey = 0.42 * s
    for dx in (-0.075, 0.075):
        d.ellipse([cx + dx * s - 0.012 * s, ey, cx + dx * s + 0.012 * s, ey + 0.026 * s], fill=(50, 40, 40))
    d.arc([cx - 0.07 * s, 0.47 * s, cx + 0.07 * s, 0.57 * s], 20, 160, fill=(150, 70, 70), width=4)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def sample(rng, seq, lo, hi):
    seq = list(seq)
    return rng.sample(seq, k=min(rng.randint(lo, hi), len(seq)))


class Command(BaseCommand):
    help = "تکمیل پروفایل مراقبان تستی: مشخصات، مهارت، نتیجه‌ی سوال‌های موقعیتی، عکس و نظرها."

    def add_arguments(self, parser):
        parser.add_argument("--approve", action="store_true", help="مراقبان draft/pending را approved کن.")
        parser.add_argument("--force", action="store_true", help="فیلدهای پرشده را هم دوباره بنویس.")
        parser.add_argument("--no-photos", action="store_true")
        parser.add_argument("--no-reviews", action="store_true")
        parser.add_argument("--limit", type=int, default=0, help="حداکثر تعداد مراقب (۰ = همه).")

    def handle(self, *a, **o):
        users = User.objects.filter(role=UserRole.CAREGIVER)
        from django.db.models import Q
        q = Q()
        for pre in FAKE_PREFIXES:
            q |= Q(username__startswith=pre)
        users = users.filter(q).order_by("id")
        if o["limit"]:
            users = users[: o["limit"]]
        self.cities = list(City.objects.select_related("province")[:300])
        self.family_users = list(User.objects.filter(role=UserRole.FAMILY).order_by("id")[:60])
        self.force = o["force"]
        count = 0
        for user in users:
            profile = CaregiverProfile.objects.filter(user=user).first()
            if profile is None:
                continue
            with transaction.atomic():
                rng = random.Random(user.id * 7919)
                self.fill_one(user, profile, rng, o)
            count += 1
        self.stdout.write(self.style.SUCCESS(f"{count} مراقب تستی تکمیل شد."))

    # ------------------------------------------------------------------
    def fill_one(self, user, profile, rng, o):
        identity = IdentityProfile.objects.filter(user=user).first() or IdentityProfile(user=user)
        female = (identity.gender or rng.choice(["female", "female", "male"])) == "female"

        if not user.first_name:
            user.first_name = rng.choice(FIRST_F if female else FIRST_M)
        if not user.last_name:
            user.last_name = rng.choice(LAST)
        user.save(update_fields=["first_name", "last_name"])

        def put(obj, field, value):
            cur = getattr(obj, field)
            if self.force or cur in (None, "", [], {}):
                setattr(obj, field, value)

        # --- مشخصات فردی ---
        put(identity, "gender", "female" if female else "male")
        year = rng.randint(1350, 1382)
        put(identity, "birth_date", jdatetime.date(year, rng.randint(1, 12), rng.randint(1, 28)))
        put(identity, "marital_status", rng.choice(c.MaritalStatus.values))
        put(identity, "children_count", rng.choice(c.ChildrenCount.values))
        put(identity, "ethnicities", sample(rng, c.Ethnicity.values[:8], 1, 1))
        talents = [t for t in c.SpecialTalent.values if t != "other"]
        put(identity, "special_talents", sample(rng, talents, 0, 3))

        # --- محل خدمت ---
        areas = list(profile.service_areas.select_related("city", "city__province"))
        if not areas and self.cities:
            for city in sample(rng, self.cities, 1, 3):
                CaregiverServiceArea.objects.get_or_create(
                    profile=profile, city=city, defaults={"province": city.province},
                )
            areas = list(profile.service_areas.select_related("city", "city__province"))
        if areas and (self.force or identity.city_id is None):
            identity.city = areas[0].city
            identity.province = areas[0].city.province if areas[0].city else None
        identity.save()

        # --- نوع خدمت و زیرشاخه ---
        if self.force or not profile.service_types:
            types = sample(rng, c.ServiceType.values, 1, 2) if rng.random() < 0.3 else [rng.choice(c.ServiceType.values)]
            subs = {}
            for t in types:
                if t == "nezafatchi":
                    subs[t] = sample(rng, c.NezafatchiSubtype.values, 1, 2)
                elif t == "madaryar":
                    subs[t] = sample(rng, c.MadaryarSubtype.values, 1, 2)
                elif t == "parastar":
                    r = rng.random()
                    if r < 0.45:
                        subs[t] = ["specialized_nurse", rng.choice(c.ParastarSpecialty.values)]
                    elif r < 0.7:
                        subs[t] = ["specialized_nurse", "nursing_specialist"]
                    else:
                        subs[t] = ["behyar", rng.choice(c.BehyarLevel.values)]
            profile.service_types, profile.service_subtypes = types, subs
        profile.serves_all_areas = profile.serves_all_areas or rng.random() < 0.15
        profile.doc_personal_photo = profile.doc_personal_photo or not o["no_photos"]

        if o["approve"] and profile.status in (CaregiverStatus.DRAFT, CaregiverStatus.PENDING, CaregiverStatus.NEEDS_MORE_DOCS):
            profile.status = CaregiverStatus.APPROVED
            profile.approved_at = timezone.now()
        profile.save()

        # --- تجربه ---
        exp, _ = CaregiverExperience.objects.get_or_create(profile=profile)
        put(exp, "elderly_care_experience", rng.choice(c.ExperienceRange.values[1:]))
        put(exp, "other_services_experience", rng.choice(c.ExperienceRange.values))
        put(exp, "patients_cared_for_count", rng.choice(c.PatientsCaredForCount.values))
        put(exp, "previous_workplaces", sample(rng, c.PreviousWorkplace.values[:-1], 1, 3))
        put(exp, "special_conditions_experience",
            sample(rng, [v for v in c.SpecialConditionExperience.values if v != "none"], 2, 6))
        exp.live_in_experience = rng.random() < 0.5
        exp.couple_care_experience = rng.random() < 0.3
        exp.solo_elderly_care_experience = rng.random() < 0.7
        exp.save()

        # --- مهارت‌ها ---
        sk, _ = CaregiverSkills.objects.get_or_create(profile=profile)
        put(sk, "education_level", rng.choice(c.EducationLevel.values[1:]))
        put(sk, "field_of_study", rng.choice(FIELDS_OF_STUDY))
        put(sk, "training_courses", sample(rng, [v for v in c.TrainingCourse.values if v != "none"], 2, 5))
        put(sk, "communication_skills", sample(rng, c.CommunicationSkill.values, 2, 4))
        put(sk, "caregiving_skills", sample(rng, c.CaregivingSkill.values, 3, 7))
        put(sk, "household_skills", sample(rng, c.HouseholdSkill.values, 1, 4))
        put(sk, "mobility_assistance_ability", sample(rng, c.MobilityAssistanceAbility.values[:4], 1, 3))
        put(sk, "foreign_languages", sample(rng, c.ForeignLanguage.values[:3], 0, 2))
        put(sk, "local_languages", sample(rng, c.LocalLanguage.values[:8], 0, 1))
        put(sk, "physical_ability", rng.choice(c.PhysicalAbility.values[1:]))
        sk.has_driving_license = rng.random() < 0.4
        sk.save()

        # --- شرایط همکاری ---
        wp, _ = CaregiverWorkPreferences.objects.get_or_create(profile=profile)
        put(wp, "collaboration_types", sample(rng, c.CollaborationType.values, 1, 3))
        days = sample(rng, c.Weekday.values[:7], 3, 7)
        put(wp, "available_days", days)
        put(wp, "available_shifts", sample(rng, c.Shift.values, 1, 3))
        wp.overnight_stay_ok = rng.random() < 0.6
        wp.holiday_work_ok = rng.random() < 0.5
        wp.save()

        # --- نتیجه‌ی سوال‌های موقعیتی ---
        qn, _ = CaregiverCompatibilityQuestionnaire.objects.get_or_create(caregiver=profile)
        if self.force or not qn.trait_profiles:
            qn.trait_profiles = self.build_trait_profiles(profile, rng)
            qn.save()

        # --- عکس ---
        if not o["no_photos"]:
            self.ensure_photo(profile, female, rng)

        # --- نظرها ---
        if not o["no_reviews"]:
            self.ensure_reviews(profile, rng)

    # ------------------------------------------------------------------
    def build_trait_profiles(self, profile, rng):
        ids = []
        for t in profile.service_types:
            sub = profile.service_subtypes.get(t, [])
            if t == "salmandyar":
                ids.append("salmandyar")
            elif t == "madaryar":
                if "newborn" in sub:
                    ids.append("newborn")
                if any(s in sub for s in ("child", "homework_helper", "housework_child")):
                    ids.append("koodakyar")
            elif t == "nezafatchi":
                if any(s in sub for s in ("inside_home", "outside_home")):
                    ids.append("cleaning")
                if "cooking" in sub:
                    ids.append("cooking")
            elif t == "parastar":
                ids.append("behyar" if "behyar" in sub else "nurse")
        out = []
        for pid in ids:
            title, traits = TRAITS[pid]
            out.append({
                "id": pid, "title": title,
                "traits": [
                    {"key": k, "label": label, "percent": rng.randint(22, 94), "questions": rng.randint(2, 4)}
                    for k, label in traits
                ],
            })
        return out

    def ensure_photo(self, profile, female, rng):
        existing = CaregiverDocumentUpload.objects.filter(
            caregiver=profile, document_type=CaregiverDocumentType.PERSONAL_PHOTO,
        ).first()
        if existing and existing.file and not self.force:
            if existing.status != CaregiverDocumentReviewStatus.APPROVED:
                existing.status = CaregiverDocumentReviewStatus.APPROVED
                existing.save(update_fields=["status"])
            return
        data = make_avatar(rng, female)
        upload = existing or CaregiverDocumentUpload(
            caregiver=profile, document_type=CaregiverDocumentType.PERSONAL_PHOTO,
        )
        upload.status = CaregiverDocumentReviewStatus.APPROVED
        upload.file.save(f"avatar_{profile.user_id}.jpg", ContentFile(data), save=False)
        upload.save()

    def ensure_reviews(self, profile, rng):
        if profile.reviews.exists() and not self.force:
            return
        n = rng.choice([0, 2, 3, 4, 5, 6, 8, 10, 12])
        if n == 0:
            return
        pool = list(PatientProfile.objects.order_by("id")[:80])
        # برای هر نظر یک تخصیصِ جدا لازم است؛ اگر بیمار کم بود چند بیمار ساختگی بساز.
        while len(pool) < 14:
            pool.append(PatientProfile.objects.create(full_name=f"{rng.choice(FIRST_F)} {rng.choice(LAST)}"))
        patients = rng.sample(pool, k=min(n, len(pool)))
        now = timezone.now()
        for patient in patients:
            assignment, _ = CaregiverAssignment.objects.get_or_create(
                caregiver=profile, patient=patient, status=AssignmentStatus.ENDED,
            )
            rating = rng.choices([5, 4, 3, 2], weights=[62, 25, 9, 4])[0]
            reviewer = rng.choice(self.family_users) if self.family_users else None
            review, created = CaregiverReview.objects.get_or_create(
                assignment=assignment, reviewer=reviewer,
                defaults={"caregiver": profile, "patient": patient, "rating": rating,
                          "comment": rng.choice(COMMENTS[rating])},
            )
            if created:
                CaregiverReview.objects.filter(pk=review.pk).update(
                    created_at=now - timedelta(days=rng.randint(3, 500)),
                )
