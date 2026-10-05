"""
اعتبارسنجی و مشتق‌گیری برنامه‌ی زمانی نوع همکاری (فرم ۲).

collaboration_schedule  ⇒  available_days / available_shifts (برای تطبیق، که
هنوز از available_shifts استفاده می‌کند).
"""
import re

from .choices import (
    COLLABORATION_DAYS_HOURS_SUBTYPES,
    Shift,
    Weekday,
)

_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
_VALID_DAYS = {c[0] for c in Weekday.choices}
_VALID_SHIFTS = {Shift.MORNING, Shift.AFTERNOON, Shift.NIGHT}  # «شبانه‌روزی» جدا و از live_in می‌آید

# شیفت‌ها به دقیقه‌ی روز؛ شب از ۱۸ تا ۶ صبح روز بعد.
_SHIFT_WINDOWS = {
    "morning": [(360, 720)],
    "afternoon": [(720, 1080)],
    "night": [(1080, 1440), (0, 360)],
}


class ScheduleError(ValueError):
    pass


def _minutes(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def clean_schedule(schedule, collaboration_types):
    """ساختار را اعتبارسنجی و پاک‌سازی می‌کند؛ کلیدهای انتخاب‌نشده حذف می‌شوند."""
    if not isinstance(schedule, dict):
        raise ScheduleError("برنامه‌ی زمانی باید یک دیکشنری باشد.")
    cleaned = {}
    for key, entry in schedule.items():
        if key not in COLLABORATION_DAYS_HOURS_SUBTYPES and key not in ("shift", "monthly"):
            raise ScheduleError(f"نوع همکاری نامعتبر در برنامه‌ی زمانی: {key}")
        if key not in collaboration_types:
            continue  # زیرگروه انتخاب نشده ⇒ برنامه‌اش نگه داشته نمی‌شود
        if not isinstance(entry, dict):
            raise ScheduleError(f"ساختار برنامه‌ی «{key}» نامعتبر است.")

        if key == "monthly":
            date = str(entry.get("target_date", "")).strip()
            if len(date) > 20:
                raise ScheduleError("تاریخ مدنظر نامعتبر است.")
            cleaned[key] = {"target_date": date}
            continue

        days = entry.get("days", [])
        if not isinstance(days, list) or any(d not in _VALID_DAYS for d in days):
            raise ScheduleError(f"روزهای «{key}» نامعتبر است.")
        item = {"days": list(dict.fromkeys(days))}

        if key == "shift":
            shifts = entry.get("shifts", [])
            if not isinstance(shifts, list) or any(x not in _VALID_SHIFTS for x in shifts):
                raise ScheduleError("شیفت‌های انتخابی نامعتبر است.")
            item["shifts"] = list(dict.fromkeys(shifts))
        else:
            for k in ("from", "to"):
                v = str(entry.get(k, "")).strip()
                if v and not _TIME_RE.match(v):
                    raise ScheduleError(f"ساعت «{k}» در «{key}» نامعتبر است (قالب HH:MM).")
                item[k] = v
        cleaned[key] = item
    return cleaned


def _window_shifts(frm, to):
    """شیفت‌هایی که بازه‌ی [frm, to) با آن‌ها هم‌پوشانی دارد."""
    f, t = _minutes(frm), _minutes(to)
    intervals = [(f, t)] if t > f else [(f, 1440), (0, t)]
    out = []
    for shift, windows in _SHIFT_WINDOWS.items():
        if any(a < wb and wa < b for (a, b) in intervals for (wa, wb) in windows):
            out.append(shift)
    return out


def derive_availability(collaboration_types, schedule):
    """(available_days, available_shifts) از روی نوع همکاری و برنامه‌ی زمانی."""
    days, shifts = [], []

    def add(lst, items):
        for x in items:
            if x not in lst:
                lst.append(x)

    if "live_in" in collaboration_types:
        add(shifts, ["24h"])
    for key, entry in (schedule or {}).items():
        if key == "monthly":
            continue
        add(days, entry.get("days", []))
        if key == "shift":
            add(shifts, entry.get("shifts", []))
        elif key == "night":
            add(shifts, ["night"])
            if entry.get("from") and entry.get("to"):
                add(shifts, _window_shifts(entry["from"], entry["to"]))
        elif entry.get("from") and entry.get("to"):
            add(shifts, _window_shifts(entry["from"], entry["to"]))
    if "all_days" in days:
        days = ["all_days"]
    return days, shifts
