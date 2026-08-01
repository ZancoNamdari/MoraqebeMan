"""
Persian (Eastern Arabic) digit conversion — for display surfaces only
(Django admin __str__/list_display, and any future server-rendered
Persian-facing text). Deliberately NOT applied to raw API JSON values —
converting a numeric id or a machine-parsed date string to Persian
digits in the API response would break every client that parses that
field as a number/date. The API contract stays Latin-digit and
machine-parseable; Persian-digit rendering is a presentation concern,
applied at the point something is actually shown to a person (admin
pages now; the Next.js frontend will do its own equivalent conversion
for user-facing screens later, the same principle, different layer).
"""
_EN_TO_FA = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def to_persian_digits(value) -> str:
    return str(value).translate(_EN_TO_FA)
