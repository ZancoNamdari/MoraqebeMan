"""
ممیزی خودکار ایزولاسیون آژانس‌ها.

به‌جای نوشتن دستیِ تست برای هر endpoint، *همه‌ی* مسیرهای /api/ که شناسه‌ی
آبجکتی دارند (agency_id, patient_id, user_id, ...) از روی URLconf پیدا
می‌شوند و با شناسه‌های *آژانس A* توسط بازیگرانِ *آژانس B* (مالک، سرپرست،
ادمین، مراقب، خانواده، بیمار) و کاربر ناشناس صدا زده می‌شوند. هر پاسخ ۲xx
یعنی نشت احتمالی؛ باید یا در ALLOWED_PUBLIC (صراحتاً عمومی) باشد یا تست شکست
می‌خورد. هر endpoint جدیدِ شناسه‌دار خودکار وارد این ممیزی می‌شود.
"""
import re
from django.db import transaction
from django.urls import get_resolver
from rest_framework.test import APIClient

from apps.accounts.models import UserRole
from apps.agencies.models import (
    AgencyAdmin, AgencyCaregiverLink, AgencyFamilyLink, AgencyLinkStatus, AgencyPatientLink,
    AgencyProfile, AgencySupervisor,
)
from apps.caregivers.models import CaregiverProfile, CaregiverStatus
from apps.families.models import FamilyProfile, LinkStatus, PatientProfile, FamilyPatientLink
from tests.base import BaseAPITestCase
from tests.factories.user_factory import make_user

# مسیرهایی که عمداً برای هر کاربرِ واردشده (یا همه) باز است — با دلیل.
ALLOWED_PUBLIC = {
    # دایرکتوری عمومیِ مراقبانِ تأییدشده برای خانواده‌ها/بیماران (بازار پلتفرم؛ بدون اطلاعات تماس/هویتی).
    # تصمیم محصولی: اگر قرار است خانواده فقط مراقبانِ آژانس خودش را ببیند، این مسیر باید محدود شود.
    "api/caregivers/public/<int:user_id>/",
}


def _routes():
    rows = []

    def walk(patterns, prefix=""):
        for p in patterns:
            s = prefix + str(p.pattern)
            if hasattr(p, "url_patterns"):
                walk(p.url_patterns, s)
            else:
                rows.append(s)

    walk(get_resolver().url_patterns)
    return [r for r in rows if r.startswith("api/") and "<" in r]


class IsolationFuzz(BaseAPITestCase):
    maxDiff = None

    def _agency(self, tag, n):
        owner = make_user(f"fz_owner_{tag}", role=UserRole.AGENCY, phone_number=f"0910{n}0001")
        agency = AgencyProfile.objects.create(user=owner, company_name=f"آژانس {tag}")
        sup_u = make_user(f"fz_sup_{tag}", role=UserRole.AGENCY_SUPERVISOR, phone_number=f"0910{n}0002")
        sup = AgencySupervisor.objects.create(user=sup_u, agency=agency, created_by=owner)
        adm_u = make_user(f"fz_adm_{tag}", role=UserRole.AGENCY_ADMIN, phone_number=f"0910{n}0003")
        adm = AgencyAdmin.objects.create(user=adm_u, agency=agency, supervisor=sup, created_by=sup_u)
        cg_u = make_user(f"fz_cg_{tag}", role=UserRole.CAREGIVER, phone_number=f"0910{n}0004")
        cg = CaregiverProfile.objects.create(user=cg_u, status=CaregiverStatus.APPROVED)
        AgencyCaregiverLink.objects.create(agency=agency, caregiver=cg, status=AgencyLinkStatus.APPROVED)
        fam_u = make_user(f"fz_fam_{tag}", role=UserRole.FAMILY, phone_number=f"0910{n}0005")
        fam = FamilyProfile.objects.create(user=fam_u)
        AgencyFamilyLink.objects.create(agency=agency, family=fam, status=AgencyLinkStatus.APPROVED)
        pat = PatientProfile.objects.create(full_name=f"بیمار {tag}")
        AgencyPatientLink.objects.create(agency=agency, patient=pat, status=AgencyLinkStatus.APPROVED)
        flink = FamilyPatientLink.objects.create(family=fam, patient=pat, relation="child", status=LinkStatus.APPROVED)
        pat_u = make_user(f"fz_pat_{tag}", role=UserRole.PATIENT, phone_number=f"0910{n}0006")
        # --- آبجکت‌های واقعی برای مسیرهایی که شناسه‌ی فرعی دارند (بدون این‌ها همه 404 می‌دهند و ممیزی بی‌معنی می‌شود)
        from datetime import date
        from decimal import Decimal
        from apps.care.models import CaregiverAssignment
        from apps.caregivers.models import BlacklistAppeal, CaregiverServiceArea
        from apps.episodic.models import EpisodicService
        from apps.finance.models import Invoice
        from apps.reminders.models import ReminderRule
        from apps.reviews.models import CaregiverNoteAboutPatient, Complaint, ComplaintCategory
        extra = {}
        extra["assignment"] = CaregiverAssignment.objects.create(caregiver=cg, patient=pat)
        extra["complaint"] = Complaint.objects.create(
            filed_by=fam_u, about_caregiver=cg, patient=pat, category=ComplaintCategory.values[0], description="x")
        extra["note"] = CaregiverNoteAboutPatient.objects.create(caregiver=cg, patient=pat)
        extra["invoice"] = Invoice.objects.create(
            agency=agency, period_type="monthly", period_start=date(2026, 1, 1), period_end=date(2026, 1, 31), amount=Decimal("1"))
        extra["area"] = CaregiverServiceArea.objects.create(profile=cg)
        extra["rule"] = ReminderRule.objects.create(
            agency=agency, pipeline_key="patients", anchor_stage="x", display_stage="x", label="x")
        extra["service"] = EpisodicService.objects.create(agency=agency, recipient_full_name="x")
        extra["appeal"] = BlacklistAppeal.objects.create(caregiver=cg, appeal_reason="x")
        return dict(extra=extra, agency=agency, owner=owner, sup_u=sup_u, sup=sup, adm_u=adm_u, adm=adm, cg_u=cg_u, cg=cg,
                    fam_u=fam_u, fam=fam, pat=pat, flink=flink, pat_u=pat_u)

    def setUp(self):
        super().setUp()
        self.A = self._agency("A", 71)
        self.B = self._agency("B", 72)

    def _values(self, a):
        return {
            "agency_id": a["agency"].id, "patient_id": a["pat"].id, "pk": a["pat"].id,
            "user_id": a["cg_u"].id, "caregiver_id": a["cg"].id, "supervisor_id": a["sup"].id,
            "admin_id": a["adm"].id, "link_id": a["flink"].id,
            "assignment_id": a["extra"]["assignment"].id, "complaint_id": a["extra"]["complaint"].id,
            "note_id": a["extra"]["note"].id, "invoice_id": a["extra"]["invoice"].id,
            "area_id": a["extra"]["area"].id, "rule_id": a["extra"]["rule"].id,
            "service_id": a["extra"]["service"].id, "appeal_id": a["extra"]["appeal"].id,
        }

    def _fill(self, route, vals):
        def sub(m):
            return str(vals.get(m.group(1), 999999))
        return "/" + re.sub(r"<(?:\w+:)?(\w+)>", sub, route).replace("^", "").replace("$", "")

    def test_no_cross_tenant_2xx(self):
        vals = self._values(self.A)
        actors = {
            "B.owner": self.B["owner"], "B.supervisor": self.B["sup_u"], "B.admin": self.B["adm_u"],
            "B.caregiver": self.B["cg_u"], "B.family": self.B["fam_u"], "B.patient": self.B["pat_u"],
            "anonymous": None,
        }
        findings = []
        for route in _routes():
            # مسیرهای دارای پارامترِ متنی (slug/document_type/pipeline_type) نیازمند مقدار واقعی‌اند؛ بقیه عددی
            if re.search(r"<(?:str:|slug:)?(slug|document_type|pipeline_type)>", route):
                continue
            path = self._fill(route, vals)
            for who, user in actors.items():
                for method in ("get", "post", "put", "patch", "delete"):
                    client = APIClient()
                    if user is not None:
                        client.force_authenticate(user)
                    sp = transaction.savepoint()
                    try:
                        resp = getattr(client, method)(path, {}, format="json")
                    except Exception as exc:  # noqa: BLE001 — کرش خودش یافته است
                        findings.append((who, method.upper(), path, f"EXC {type(exc).__name__}"))
                        transaction.savepoint_rollback(sp)
                        continue
                    transaction.savepoint_rollback(sp)
                    if 200 <= resp.status_code < 300 and route not in ALLOWED_PUBLIC:
                        findings.append((who, method.upper(), path, resp.status_code))
        report = "\n".join(f"{w:12} {m:6} {p}  -> {s}" for w, m, p, s in findings)
        self.assertEqual(findings, [], "\nنشت‌های احتمالی (۲xx برای بازیگر آژانس/نقش دیگر):\n" + report)


    def test_positive_control_owner_of_A_reaches_A_data(self):
        """بدون این، ممیزیِ بالا می‌تواند «همه چیز 404 است» را اشتباهاً امن بخواند."""
        vals = self._values(self.A)
        client = APIClient(); client.force_authenticate(self.A["owner"])
        ok = 0
        for route in _routes():
            if "agency_id" in route and re.search(r"<(?:\w+:)?agency_id>", route) and route.count("<") == 1:
                if 200 <= client.get(self._fill(route, vals)).status_code < 300:
                    ok += 1
        self.assertGreaterEqual(ok, 5, f"فقط {ok} مسیر agency_id برای مالکِ خود آژانس 2xx داد؛ ممیزی معتبر نیست")


    def test_list_endpoints_never_contain_other_agencys_data(self):
        """مسیرهای بدون شناسه (فهرست‌ها، /me/، داشبوردها): بازیگرانِ B نباید هیچ نشانه‌ای از A ببینند."""
        A = self.A
        markers = {
            A["pat"].full_name, A["agency"].company_name, A["agency"].access_code, A["pat"].access_code,
            A["owner"].username, A["sup_u"].username, A["adm_u"].username, A["cg_u"].username, A["fam_u"].username,
            A["owner"].phone_number, A["sup_u"].phone_number, A["adm_u"].phone_number,
            A["cg_u"].phone_number, A["fam_u"].phone_number,
        }
        markers = {m for m in markers if m}
        actors = {
            "B.owner": self.B["owner"], "B.supervisor": self.B["sup_u"], "B.admin": self.B["adm_u"],
            "B.caregiver": self.B["cg_u"], "B.family": self.B["fam_u"], "B.patient": self.B["pat_u"],
        }
        rows = []

        def walk(patterns, prefix=""):
            for p in patterns:
                sp = prefix + str(p.pattern)
                if hasattr(p, "url_patterns"):
                    walk(p.url_patterns, sp)
                else:
                    rows.append(sp)

        walk(get_resolver().url_patterns)
        list_routes = [r for r in rows if r.startswith("api/") and "<" not in r and "(?P" not in r]
        leaks, hits = [], 0
        for route in list_routes:
            path = "/" + route.replace("^", "").replace("$", "")
            for who, user in actors.items():
                client = APIClient(); client.force_authenticate(user)
                resp = client.get(path)
                if 200 <= resp.status_code < 300:
                    hits += 1
                    body = resp.content.decode("utf-8", "ignore")
                    # JSON فارسی ممکن است escape شود؛ هر دو شکل را بررسی کن
                    import json
                    body2 = json.dumps(json.loads(body), ensure_ascii=False) if body.strip().startswith(("{", "[")) else body
                    for m in markers:
                        if m in body or m in body2:
                            leaks.append((who, path, m))
        self.assertGreater(hits, 20, "ممیزی معتبر نیست: تقریباً هیچ مسیر فهرستی 2xx نداد")
        self.assertEqual(leaks, [], "نشت داده‌ی آژانس A به بازیگر B:\n" + "\n".join(map(str, leaks)))
